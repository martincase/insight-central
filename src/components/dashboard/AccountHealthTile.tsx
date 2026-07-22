import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, ShieldAlert, ShieldCheck, ShieldX, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "NORMAL" | "AT_RISK" | "DEACTIVATED";

interface HealthRow {
  account_name: string;
  marketplace_id: string;
  current_status: Status;
  previous_status: Status | null;
  changed_at: string | null;
  updated_at: string | null;
}

const MARKETPLACE_MAP: Record<string, string> = {
  A1F83G8C2ARO7P: "UK",
  A1PA6795UKMFR9: "DE",
  A13V1IB3VIYZZH: "FR",
  APJ6JRA9NG5V4: "IT",
  A1RKKUPIHCS9HS: "ES",
  A1805IZSGTT6HS: "NL",
  A2NODRKZP88ZB9: "SE",
  A1C3SOZRARQ6R3: "PL",
  AMEN7PMS3EDWL: "BE",
  ATVPDKIKX0DER: "US",
  A2EUQ1WTGCTBG2: "CA",
  A1AM78C64UM0Y8: "MX",
  A39IBJ37TRP1C6: "AU",
  A1VC38T7YXB528: "JP",
  A19VAU5U5O7RUS: "SG",
};

const marketplaceLabel = (id: string) => MARKETPLACE_MAP[id] || id;

const STATUS_RANK: Record<Status, number> = { DEACTIVATED: 3, AT_RISK: 2, NORMAL: 1 };

const worstStatus = (rows: HealthRow[]): Status =>
  rows.reduce<Status>(
    (worst, r) => (STATUS_RANK[r.current_status] > STATUS_RANK[worst] ? r.current_status : worst),
    "NORMAL",
  );

const statusBadge = (status: Status) => {
  const config = {
    NORMAL: { cls: "bg-green-100 text-green-800 hover:bg-green-100", label: "Normal" },
    AT_RISK: { cls: "bg-amber-100 text-amber-800 hover:bg-amber-100", label: "At Risk" },
    DEACTIVATED: { cls: "bg-red-100 text-red-800 hover:bg-red-100", label: "Deactivated" },
  }[status];
  return <Badge className={cn("border-transparent font-semibold", config.cls)}>{config.label}</Badge>;
};

const statusIcon = (status: Status) => {
  if (status === "DEACTIVATED") return <ShieldX className="h-4 w-4 text-red-600" />;
  if (status === "AT_RISK") return <ShieldAlert className="h-4 w-4 text-amber-600" />;
  return <ShieldCheck className="h-4 w-4 text-green-600" />;
};

export const AccountHealthTile = () => {
  const [rows, setRows] = useState<HealthRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showNormal, setShowNormal] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("account_health_status")
        .select("account_name, marketplace_id, current_status, previous_status, changed_at, updated_at");
      if (error) {
        console.error(error);
        setError(error.message);
        setRows([]);
        return;
      }
      setRows((data || []) as HealthRow[]);
    })();
  }, []);

  const grouped = useMemo(() => {
    if (!rows) return [];
    const map = new Map<string, HealthRow[]>();
    for (const r of rows) {
      if (!map.has(r.account_name)) map.set(r.account_name, []);
      map.get(r.account_name)!.push(r);
    }
    return Array.from(map.entries())
      .map(([name, mkts]) => ({ name, mkts, worst: worstStatus(mkts) }))
      .sort((a, b) => {
        const d = STATUS_RANK[b.worst] - STATUS_RANK[a.worst];
        if (d !== 0) return d;
        return a.name.localeCompare(b.name);
      });
  }, [rows]);

  const problems = grouped.filter((g) => g.worst !== "NORMAL");
  const normals = grouped.filter((g) => g.worst === "NORMAL");
  const counts = {
    deactivated: grouped.filter((g) => g.worst === "DEACTIVATED").length,
    atRisk: grouped.filter((g) => g.worst === "AT_RISK").length,
    normal: normals.length,
  };

  const toggle = (name: string) => setExpanded((e) => ({ ...e, [name]: !e[name] }));

  const renderAccountRow = (g: { name: string; mkts: HealthRow[]; worst: Status }) => {
    const isOpen = !!expanded[g.name];
    const nonNormal = g.mkts.filter((m) => m.current_status !== "NORMAL");
    const canExpand = g.mkts.length > 0;
    return (
      <div
        key={g.name}
        className={cn(
          "rounded-lg border transition-colors",
          g.worst === "DEACTIVATED" && "border-red-200 bg-red-50/40",
          g.worst === "AT_RISK" && "border-amber-200 bg-amber-50/40",
          g.worst === "NORMAL" && "border-gray-200 bg-white",
        )}
      >
        <button
          type="button"
          onClick={() => canExpand && toggle(g.name)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            {canExpand ? (
              isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )
            ) : (
              <div className="w-4 shrink-0" />
            )}
            {statusIcon(g.worst)}
            <span className="font-medium truncate">{g.name}</span>
            {nonNormal.length > 0 && (
              <span className="text-xs text-muted-foreground shrink-0">
                · {nonNormal.map((m) => marketplaceLabel(m.marketplace_id)).join(", ")}
              </span>
            )}
          </div>
          <div className="shrink-0">{statusBadge(g.worst)}</div>
        </button>
        {isOpen && (
          <div className="px-3 pb-3 pt-1 border-t border-dashed border-current/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {g.mkts
                .slice()
                .sort((a, b) => STATUS_RANK[b.current_status] - STATUS_RANK[a.current_status])
                .map((m) => (
                  <div
                    key={m.marketplace_id}
                    className="flex items-center justify-between rounded-md border bg-white px-2.5 py-1.5"
                  >
                    <span className="text-sm font-medium">{marketplaceLabel(m.marketplace_id)}</span>
                    {statusBadge(m.current_status)}
                  </div>
                ))}
            </div>
            {g.worst !== "NORMAL" && (
              <p className="text-[11px] text-muted-foreground mt-2">
                A per-marketplace non-Normal status can reflect a dormant/unused marketplace, not always a genuine suspension.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Account Health
          </CardTitle>
          {rows && (
            <div className="flex items-center gap-2 text-xs">
              {counts.deactivated > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium">
                  {counts.deactivated} deactivated
                </span>
              )}
              {counts.atRisk > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                  {counts.atRisk} at risk
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
                {counts.normal} normal
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows === null && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {error && <p className="text-sm text-destructive">Failed to load account health: {error}</p>}
        {rows && rows.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">No account health data available.</p>
        )}
        {rows && rows.length > 0 && problems.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50/50 px-3 py-2.5">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800 font-medium">
              All {normals.length} accounts are healthy across every marketplace.
            </span>
          </div>
        )}
        {problems.map(renderAccountRow)}
        {rows && rows.length > 0 && normals.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowNormal((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {showNormal ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {showNormal ? "Hide" : "Show"} {normals.length} healthy account{normals.length === 1 ? "" : "s"}
            </button>
            {showNormal && (
              <div className="mt-2 space-y-2 opacity-80">{normals.map(renderAccountRow)}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountHealthTile;
