import { useEffect, useState } from "react";
import { MessageSquarePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CONFIG = {
  app: "insight-central",
  table: "insight_central_feedback",
  bucket: "feedback",
};
const CATEGORIES = ["Bug", "Idea", "Data looks wrong", "Other"] as const;
type Category = (typeof CATEGORIES)[number];
type CaptureState = "idle" | "capturing" | "ready" | "failed";

export function FeedbackWidget() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [shot, setShot] = useState<Blob | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [includeShot, setIncludeShot] = useState(true);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<Category>("Bug");

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!shot) { setShotUrl(null); return; }
    const url = URL.createObjectURL(shot);
    setShotUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [shot]);

  if (!mounted) return null;

  const reset = () => {
    setOpen(false);
    setCaptureState("idle");
    setMessage("");
    setCategory("Bug");
    setShot(null);
    setIncludeShot(true);
  };

  const openForm = () => {
    if (open) return;
    setOpen(true);
    setShot(null);
    setCaptureState("capturing");
    void captureScreenshot();
  };

  const captureScreenshot = async () => {
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await Promise.race([
        html2canvas(document.body, {
          logging: false,
          useCORS: true,
          scale: Math.min(window.devicePixelRatio || 1, 2),
          ignoreElements: (el: Element) =>
            el instanceof HTMLElement && el.dataset.feedbackUi === "true",
        }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("capture timeout")), 8000)),
      ]);
      canvas.toBlob((b) => { setShot(b); setCaptureState(b ? "ready" : "failed"); }, "image/png", 0.85);
    } catch (e) {
      console.error("[feedback] screenshot failed", e);
      setShot(null);
      setCaptureState("failed");
    }
  };

  const submit = async () => {
    if (!message.trim()) { toast.error("Please write a short note."); return; }
    setSubmitting(true);
    try {
      let path: string | null = null;
      if (captureState === "ready" && includeShot && shot) {
        const p = `${crypto.randomUUID()}.png`;
        const { error } = await supabase.storage.from(CONFIG.bucket).upload(p, shot, { contentType: "image/png" });
        if (error) console.error("[feedback] upload failed", error);
        else path = p;
      }
      const { error: insErr } = await (supabase as any).from(CONFIG.table).insert({
        app: CONFIG.app,
        page_path: location.pathname,
        page_url: location.href,
        cycle: new URLSearchParams(location.search).get("cycle"),
        category,
        message: message.trim(),
        screenshot_path: path,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        user_agent: navigator.userAgent,
      });
      if (insErr) throw insErr;
      toast.success("Thanks — feedback sent.");
      reset();
    } catch (e) {
      console.error("[feedback] submit failed", e);
      toast.error("Couldn't send feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openForm}
        className="fixed bottom-4 right-4 z-50 print:hidden inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 px-4 py-2.5 text-sm font-medium"
        aria-label="Send feedback"
        data-feedback-ui="true"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span>Feedback</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 print:hidden flex items-end sm:items-center justify-center bg-black/40 p-4" data-feedback-ui="true">
          <div className="w-full max-w-md rounded-lg border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm font-semibold">Send feedback</div>
              <button type="button" onClick={reset} className="rounded p-1 text-muted-foreground hover:bg-accent" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">What happened? <span className="text-destructive">*</span></label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} autoFocus placeholder="Describe the issue or idea…" className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
              </div>
              {captureState === "capturing" && (
                <div className="rounded-md border p-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Capturing screenshot…
                  </div>
                </div>
              )}
              {captureState === "failed" && (
                <div className="rounded-md border p-2 text-xs text-muted-foreground">
                  Screenshot unavailable — your note will still be sent.
                </div>
              )}
              {captureState === "ready" && shotUrl && (
                <div className="rounded-md border p-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-muted-foreground">Screenshot</div>
                    <label className="text-xs inline-flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={!includeShot} onChange={(e) => setIncludeShot(!e.target.checked)} /> Remove screenshot
                    </label>
                  </div>
                  {includeShot && <img src={shotUrl} alt="Screenshot preview" className="max-h-40 w-full object-contain rounded border bg-muted" />}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button type="button" onClick={reset} disabled={submitting} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">Cancel</button>
              <button type="button" onClick={submit} disabled={submitting || !message.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackWidget;
