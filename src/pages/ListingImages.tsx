import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

/**
 * Images hosted for Amazon SP-API image pushes.
 *
 * Source of truth is the `vw_listing_images` view: `listing_images` (written when
 * listing-image-host republishes an image) joined to `listing_image_pushes`
 * (written by spapi-listings itself on every LIVE image write). Read-only —
 * uploads happen through the API, and cleanup runs on a daily cron.
 */

interface PushTarget {
  sku: string | null;
  marketplace_id: string | null;
  attribute: string | null;
  account: string | null;
  status: string | null;
  pushed_at: string | null;
}

interface ImageRow {
  id: string;
  path: string;
  url: string;
  brand: string | null;
  product_ref: string | null;
  filename: string | null;
  mb: number | null;
  content_type: string | null;
  width: number | null;
  height: number | null;
  keep: boolean;
  created_at: string;
  deleted_at: string | null;
  file_present: boolean;
  push_count: number;
  last_pushed_at: string | null;
  uploaded: boolean;
  status_label: string;
  age_days: number | null;
  targets: PushTarget[] | null;
}

type Filter = "awaiting" | "uploaded" | "purged" | "all";

const MARKETPLACES: Record<string, string> = {
  A1F83G8C2ARO7P: "UK",
  A1PA6795UKMFR9: "DE",
  A13V1IB3VIYZZH: "FR",
  A1RKKUPIHCS9HS: "ES",
  APJ6JRA9NG5V4: "IT",
  A1805IZSGTT6HS: "NL",
  AMEN7PMS3EDWL: "BE",
  ATVPDKIKX0DER: "US",
};

// other_product_image_locator_3 -> "Gallery 3"; main -> "MAIN"
const slotLabel = (attr: string | null) => {
  if (!attr) return "—";
  if (attr.startsWith("main")) return "MAIN";
  if (attr.startsWith("swatch")) return "Swatch";
  const n = attr.match(/_(\d+)$/)?.[1];
  return n ? `Gallery ${n}` : attr;
};

// Days left before the cleanup cron purges the file (7 after a push, else 30).
const daysLeft = (row: ImageRow) => {
  if (row.keep || !row.file_present) return null;
  const window = row.uploaded ? 7 : 30;
  return Math.max(0, window - (row.age_days ?? 0));
};

const ListingImages = () => {
  const { isStaff, loading: authLoading } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["listing-images"],
    enabled: !authLoading && isStaff,
    queryFn: async (): Promise<ImageRow[]> => {
      const { data, error } = await (supabase as any)
        .from("vw_listing_images")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ImageRow[];
    },
  });

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied");
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-sm text-muted-foreground">
        Checking access…
      </div>
    );
  }
  if (!isStaff) return <Navigate to="/" replace />;

  const rows = data ?? [];
  const live = rows.filter((r) => r.file_present);
  const awaiting = live.filter((r) => !r.uploaded);
  const uploaded = live.filter((r) => r.uploaded);
  const purged = rows.filter((r) => !r.file_present);
  const storageMb = live.reduce((s, r) => s + (Number(r.mb) || 0), 0);

  const filtered =
    filter === "awaiting" ? awaiting
    : filter === "uploaded" ? uploaded
    : filter === "purged" ? purged
    : rows;

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: rows.length },
    { key: "awaiting", label: "Awaiting push", count: awaiting.length },
    { key: "uploaded", label: "Pushed", count: uploaded.length },
    { key: "purged", label: "Purged", count: purged.length },
  ];

  const tiles = [
    { label: "Hosted now", value: String(live.length) },
    { label: "Awaiting push", value: String(awaiting.length) },
    { label: "Pushed to Amazon", value: String(uploaded.length) },
    { label: "Storage used", value: `${storageMb.toFixed(1)} MB` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Listing images</h1>
        <p className="text-sm text-muted-foreground">
          Images hosted for Amazon SP-API pushes. Pushed files are purged 7 days after upload,
          unpushed after 30 — history is kept either way.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{t.label}</div>
              <div className="text-2xl font-semibold mt-1">{t.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-1 mb-4 bg-muted p-1 rounded-lg w-fit flex-wrap">
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
          <Loader2 className="h-4 w-4 animate-spin" /> Loading images…
        </div>
      )}
      {error && (
        <div className="text-sm text-destructive">
          Failed to load images: {(error as Error).message}
        </div>
      )}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-sm text-muted-foreground">Nothing here yet.</div>
      )}

      <div className="space-y-3">
        {filtered.map((row) => {
          const left = daysLeft(row);
          return (
            <Card key={row.id} className={!row.file_present ? "opacity-60 border-muted" : undefined}>
              <CardContent className="p-4">
                <div className="flex gap-4 flex-col sm:flex-row">
                  <div className="shrink-0">
                    {row.file_present ? (
                      <a href={row.url} target="_blank" rel="noreferrer">
                        <img
                          src={row.url}
                          alt={row.filename ?? "Listing image"}
                          loading="lazy"
                          className="h-28 w-28 rounded border bg-muted object-contain"
                        />
                      </a>
                    ) : (
                      <div className="h-28 w-28 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground text-center px-2">
                        file purged
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium truncate">{row.filename}</span>
                      <Badge
                        variant="outline"
                        className={
                          row.uploaded
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                        }
                      >
                        {row.status_label}
                      </Badge>
                      {row.keep && <Badge variant="secondary" className="text-xs">kept</Badge>}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {[
                        row.brand,
                        row.product_ref,
                        row.width && row.height ? `${row.width}×${row.height}` : null,
                        row.mb ? `${row.mb} MB` : null,
                        `hosted ${new Date(row.created_at).toLocaleDateString()}`,
                        left !== null ? `purges in ${left}d` : row.deleted_at ? "purged" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>

                    {row.targets && row.targets.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {row.targets.map((t, i) => (
                          <div key={i} className="text-xs flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-[10px]">
                              {MARKETPLACES[t.marketplace_id ?? ""] ?? t.marketplace_id ?? "—"}
                            </Badge>
                            <code className="font-mono">{t.sku}</code>
                            <span className="text-muted-foreground">
                              {slotLabel(t.attribute)}
                              {t.status ? ` · ${t.status}` : ""}
                              {t.pushed_at ? ` · ${new Date(t.pushed_at).toLocaleString()}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {row.file_present && (
                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={() => copy(row.url)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy URL
                        </Button>
                        <a href={row.url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="ghost">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                          </Button>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ListingImages;
