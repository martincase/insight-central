import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface FeedbackRow {
  id: string;
  created_at: string;
  app: string | null;
  page_path: string | null;
  page_url: string | null;
  cycle: string | null;
  category: string | null;
  message: string;
  screenshot_path: string | null;
  viewport: string | null;
  user_agent: string | null;
  status: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

type FilterStatus = "open" | "done" | "all";

const categoryClass = (c: string | null) => {
  switch (c) {
    case "Bug": return "bg-destructive/15 text-destructive border-destructive/30";
    case "Idea": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "Data looks wrong": return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    default: return "bg-secondary text-secondary-foreground border-border";
  }
};

const statusLabel = (status: string | null) => {
  switch (status) {
    case "done": return "Done";
    case "wontfix": return "Won't fix";
    default: return "Open";
  }
};

const FeedbackAdmin = () => {
  const { user, isStaff, loading: authLoading } = useAuth();
  const [filter, setFilter] = useState<FilterStatus>("open");
  const queryClient = useQueryClient();

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "open" | "done" | "wontfix" }) => {
      const { error } = await (supabase as any)
        .from("insight_central_feedback")
        .update({
          status,
          resolved_at: status === "open" ? null : new Date().toISOString(),
          resolved_by: status === "open" ? null : (user?.email ?? null),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["feedback-admin"] }); },
    onError: (e) => toast.error(`Couldn't update: ${(e as Error).message}`),
  });

  const pendingId = setStatus.isPending ? setStatus.variables?.id : null;

  const { data, isLoading, error } = useQuery({
    queryKey: ["feedback-admin"],
    enabled: !authLoading && isStaff,
    queryFn: async (): Promise<FeedbackRow[]> => {
      const { data, error } = await (supabase as any)
        .from("insight_central_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as FeedbackRow[];
    },
  });

  const publicUrl = (path: string) =>
    supabase.storage.from("feedback").getPublicUrl(path).data.publicUrl;

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-sm text-muted-foreground">
        Checking access…
      </div>
    );
  }
  if (!isStaff) return <Navigate to="/" replace />;

  const allRows = data ?? [];
  const openCount = allRows.filter((r) => r.status === "open" || r.status == null).length;
  const doneCount = allRows.filter((r) => r.status !== "open" && r.status != null).length;

  const filteredRows = allRows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "open") return row.status === "open" || row.status == null;
    return row.status !== "open" && row.status != null;
  });

  const tabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: "open", label: "Open", count: openCount },
    { key: "done", label: "Done", count: doneCount },
    { key: "all", label: "All", count: allRows.length },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Feedback</h1>
        <p className="text-sm text-muted-foreground">Latest 200 submissions, newest first.</p>
      </div>

      <div className="flex gap-1 mb-4 bg-muted p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading feedback…
        </div>
      )}
      {error && (
        <div className="text-sm text-destructive">Failed to load feedback: {(error as Error).message}</div>
      )}
      {!isLoading && !error && filteredRows.length === 0 && (
        <div className="text-sm text-muted-foreground">No {filter === "all" ? "feedback submissions" : `${filter} feedback`} yet.</div>
      )}

      <div className="space-y-3">
        {filteredRows.map((row) => {
          const isOpen = row.status === "open" || row.status == null;
          const busy = pendingId === row.id;
          return (
            <Card key={row.id} className={!isOpen ? "opacity-70 border-muted" : undefined}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={categoryClass(row.category)}>
                      {row.category ?? "Other"}
                    </Badge>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </CardTitle>
                    {!isOpen && (
                      <Badge variant="secondary" className="text-xs">
                        {statusLabel(row.status)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    {isOpen ? (
                      <>
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => setStatus.mutate({ id: row.id, status: "done" })}
                        >
                          {busy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                          Mark done
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => setStatus.mutate({ id: row.id, status: "wontfix" })}
                        >
                          Won&apos;t fix
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {statusLabel(row.status)} · {row.resolved_at ? new Date(row.resolved_at).toLocaleString() : "just now"}
                          {row.resolved_by ? ` · ${row.resolved_by}` : ""}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => setStatus.mutate({ id: row.id, status: "open" })}
                        >
                          Reopen
                        </Button>
                      </>
                    )}
                    {row.page_path && (
                      <code className="text-xs font-mono text-muted-foreground truncate max-w-[50%]">
                        {row.page_path}
                      </code>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm whitespace-pre-wrap">{row.message}</div>
                <div className="text-xs text-muted-foreground">
                  {[row.viewport, row.cycle ? `cycle=${row.cycle}` : null, row.app]
                    .filter(Boolean).join(" · ")}
                </div>
                {row.screenshot_path && (
                  <a
                    href={publicUrl(row.screenshot_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block"
                  >
                    <img
                      src={publicUrl(row.screenshot_path)}
                      alt="Feedback screenshot"
                      className="max-h-48 rounded border bg-muted object-contain"
                    />
                  </a>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FeedbackAdmin;
