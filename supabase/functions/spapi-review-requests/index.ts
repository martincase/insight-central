import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// spapi-review-requests — Amazon "Request a Review" (SP-API Solicitations API) for SELLER accounts.
//
// For one account: pull shipped orders purchased 5–30 days ago, ask Amazon per order whether the
// productReviewAndSellerFeedback solicitation is available, and log the answer to review_request_log.
//
// DRY RUN BY DEFAULT. The only calls made in a dry run are reads:
//   GET /sellers/v1/marketplaceParticipations
//   GET /orders/v0/orders
//   GET /solicitations/v1/orders/{orderId}        (eligibility check — sends nothing)
// A request is only SENT when ALL THREE hold:
//   1. ?mode=send
//   2. function secret REVIEW_REQUESTS_SEND_ENABLED = 'true'
//   3. review_request_settings.enabled = true for the account
//
// Params: ?account=<sp_api_credentials.account_name> (required)
//         &mode=dryrun|send   &max=<eligibility checks this run, default 60>
//         &budget=<seconds, default 110>   &minDays=5 &maxDays=30
// Called via pg_net like the other spapi-* functions; the reply carries counts only, order-level
// detail lives in review_request_log (service role only).

const REGION_HOST: Record<string, string> = {
  EU: "https://sellingpartnerapi-eu.amazon.com",
  NA: "https://sellingpartnerapi-na.amazon.com",
  FE: "https://sellingpartnerapi-fe.amazon.com",
};

const MARKETPLACE_COUNTRY: Record<string, string> = {
  A1F83G8C2ARO7P: "UK", A1PA6795UKMFR9: "DE", A13V1IB3VIYZZH: "FR", APJ6JRA9NG5V4: "IT",
  A1RKKUPIHCS9HS: "ES", A1805IZSGTT6HS: "NL", A2NODRKZP88ZB9: "SE", A1C3SOZRARQ6R3: "PL",
  AMEN7PMS3EDWL: "BE", A28R8C7NBKEWEA: "IE", A33AVAJ2PDY3EV: "TR", ATVPDKIKX0DER: "US",
  A2EUQ1WTGCTBG2: "CA", A1AM78C64UM0Y8: "MX", A39IBJ37TRP1C6: "AU", A1VC38T7YXB528: "JP",
};

const REVIEW_ACTION = "productReviewAndSellerFeedback";

const json = (o: unknown, code = 200) =>
  new Response(JSON.stringify(o, null, 2), { status: code, headers: { "content-type": "application/json" } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function sb() {
  return { url: Deno.env.get("SUPABASE_URL")!, key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! };
}

async function rest(path: string, init: RequestInit = {}) {
  const { url, key } = sb();
  const r = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`db ${r.status} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function accessToken(refresh: string) {
  const r = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
      client_id: Deno.env.get("LWA_CLIENT_ID")!,
      client_secret: Deno.env.get("LWA_CLIENT_SECRET")!,
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("token error: " + JSON.stringify(j));
  return j.access_token as string;
}

// One place that talks to Amazon. Retries a 429 twice with backoff.
async function amazon(url: string, token: string, method = "GET") {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, { method, headers: { "x-amz-access-token": token, "content-type": "application/json" } });
    const text = await r.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = text; }
    if (r.status === 429 && attempt < 2) { await sleep(2000 * (attempt + 1)); continue; }
    return { http: r.status, body };
  }
}

Deno.serve(async (req) => {
  const started = Date.now();
  try {
    const p = new URL(req.url).searchParams;
    const account = p.get("account");
    if (!account) return json({ error: "account= required" }, 400);
    const wantSend = p.get("mode") === "send";
    const maxChecks = Math.min(Number(p.get("max") ?? 60), 300);
    const budgetMs = Math.min(Number(p.get("budget") ?? 110), 380) * 1000;
    const minDays = Number(p.get("minDays") ?? 5);
    const maxDays = Number(p.get("maxDays") ?? 30);

    const creds = await rest(
      `sp_api_credentials?account_name=eq.${encodeURIComponent(account)}&status=eq.active&select=refresh_token,selling_partner_id,region,account_type&limit=1`,
    );
    const cred = creds?.[0];
    if (!cred) return json({ error: "no active credential for " + account }, 404);
    if (cred.account_type !== "seller") return json({ error: "Solicitations API is seller-only; " + account + " is " + cred.account_type }, 400);

    // Sending needs all three switches. Anything short of that is a dry run.
    const settings = await rest(`review_request_settings?account_name=eq.${encodeURIComponent(account)}&select=enabled`);
    const accountEnabled = settings?.[0]?.enabled === true;
    const globalEnabled = Deno.env.get("REVIEW_REQUESTS_SEND_ENABLED") === "true";
    const liveSend = wantSend && accountEnabled && globalEnabled;
    const mode = liveSend ? "send" : "dryrun";

    const [run] = await rest("review_request_runs", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({ account_name: account, mode }),
    });
    const runId = run.run_id as string;

    const BASE = REGION_HOST[cred.region] ?? REGION_HOST.EU;
    const token = await accessToken(cred.refresh_token);

    // 1. Marketplaces this seller actually trades in.
    const mp = await amazon(`${BASE}/sellers/v1/marketplaceParticipations`, token);
    if (mp.http !== 200) throw new Error(`marketplaceParticipations ${mp.http}: ${JSON.stringify(mp.body)}`);
    const marketplaceIds: string[] = (mp.body?.payload ?? [])
      .filter((x: any) => x.participation?.isParticipating && MARKETPLACE_COUNTRY[x.marketplace?.id])
      .map((x: any) => x.marketplace.id);

    // 2. Shipped orders purchased minDays..maxDays ago. Amazon decides the exact 5–30-days-after-
    //    delivery window; this range just keeps the candidate list sensible.
    const day = 86400000;
    const createdAfter = new Date(Date.now() - maxDays * day).toISOString();
    const createdBefore = new Date(Date.now() - minDays * day).toISOString();
    const orders: any[] = [];
    let nextToken: string | null = null;
    let pages = 0;
    const orderErrors: unknown[] = [];
    if (marketplaceIds.length) {
      do {
        const q = nextToken
          ? new URLSearchParams({ MarketplaceIds: marketplaceIds.join(","), NextToken: nextToken })
          : new URLSearchParams({
            MarketplaceIds: marketplaceIds.join(","), CreatedAfter: createdAfter, CreatedBefore: createdBefore,
            OrderStatuses: "Shipped", MaxResultsPerPage: "100",
          });
        const r = await amazon(`${BASE}/orders/v0/orders?${q}`, token);
        if (r.http !== 200) { orderErrors.push({ http: r.http, body: r.body }); break; }
        orders.push(...(r.body?.payload?.Orders ?? []));
        nextToken = r.body?.payload?.NextToken ?? null;
        pages++;
      } while (nextToken && pages < 10 && Date.now() - started < budgetMs / 3);
    }
    const ordersTruncated = !!nextToken;

    // Drop orders a buyer can't be asked about: MCF (Non-Amazon) and replacements.
    // NB: Amazon sends IsReplacementOrder as the string "false"/"true", not a boolean.
    const candidates = orders.filter((o) =>
      o.SalesChannel !== "Non-Amazon" && String(o.IsReplacementOrder) !== "true" && MARKETPLACE_COUNTRY[o.MarketplaceId]
    );
    const excluded = {
      nonAmazon: orders.filter((o) => o.SalesChannel === "Non-Amazon").length,
      replacement: orders.filter((o) => String(o.IsReplacementOrder) === "true").length,
      unknownMarketplace: orders.filter((o) => !MARKETPLACE_COUNTRY[o.MarketplaceId]).length,
    };

    // Skip orders already sent, or checked in the last 20 hours.
    const done = new Set<string>();
    const since = new Date(Date.now() - 20 * 3600000).toISOString();
    const ids = candidates.map((o) => o.AmazonOrderId);
    for (let i = 0; i < ids.length; i += 150) {
      const batch = ids.slice(i, i + 150).map((x) => `"${x}"`).join(",");
      const rows = await rest(
        `review_request_log?selling_partner_id=eq.${cred.selling_partner_id}&amazon_order_id=in.(${batch})` +
          `&or=(status.eq.sent,checked_at.gte."${since}")&select=amazon_order_id`,
      );
      for (const r of rows ?? []) done.add(r.amazon_order_id);
    }
    // Check the likeliest orders first: those bought ~12–20 days ago are almost always inside
    // Amazon's 5–30-days-after-delivery window; the oldest and newest often fall outside it.
    const ageDays = (o: any) => (Date.now() - Date.parse(o.PurchaseDate)) / day;
    const todo = candidates
      .filter((o) => !done.has(o.AmazonOrderId))
      .sort((a, b) => Math.abs(ageDays(a) - 16) - Math.abs(ageDays(b) - 16));

    // 3. Ask Amazon about each order (1 req/s per account), and send only in live mode.
    const counts: Record<string, number> = { eligible: 0, not_eligible: 0, sent: 0, send_failed: 0, error: 0 };
    const byCountry: Record<string, Record<string, number>> = {};
    let checked = 0;
    let stopReason = "all candidates checked";
    let missingRole = false;

    for (const o of todo) {
      if (checked >= maxChecks) { stopReason = "max checks reached"; break; }
      if (Date.now() - started > budgetMs) { stopReason = "time budget reached"; break; }
      checked++;
      const mkt = o.MarketplaceId;
      const check = await amazon(
        `${BASE}/solicitations/v1/orders/${encodeURIComponent(o.AmazonOrderId)}?marketplaceIds=${mkt}`,
        token,
      );
      let status: string;
      let detail: unknown = null;
      let sentAt: string | null = null;
      if (check.http === 200) {
        const actions: string[] = (check.body?._links?.actions ?? []).map((a: any) => a.name);
        detail = { actions };
        if (actions.includes(REVIEW_ACTION)) {
          status = "eligible";
          if (liveSend) {
            await sleep(1100);
            const s = await amazon(
              `${BASE}/solicitations/v1/orders/${encodeURIComponent(o.AmazonOrderId)}/solicitations/${REVIEW_ACTION}?marketplaceIds=${mkt}`,
              token,
              "POST",
            );
            if (s.http === 201) { status = "sent"; sentAt = new Date().toISOString(); }
            else { status = "send_failed"; detail = { http: s.http, body: s.body }; }
          }
        } else {
          status = "not_eligible";
        }
      } else {
        status = "error";
        detail = { http: check.http, body: check.body };
        if (check.http === 403) missingRole = true;
      }

      counts[status] = (counts[status] ?? 0) + 1;
      const c = MARKETPLACE_COUNTRY[mkt];
      byCountry[c] ??= {};
      byCountry[c][status] = (byCountry[c][status] ?? 0) + 1;

      await rest("review_request_log?on_conflict=selling_partner_id,amazon_order_id", {
        method: "POST",
        headers: { prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          account_name: account,
          selling_partner_id: cred.selling_partner_id,
          marketplace_id: mkt,
          amazon_order_id: o.AmazonOrderId,
          purchase_date: o.PurchaseDate ?? null,
          latest_delivery_date: o.LatestDeliveryDate ?? null,
          fulfillment_channel: o.FulfillmentChannel ?? null,
          status,
          http_status: check.http,
          detail,
          dry_run: !liveSend,
          run_id: runId,
          checked_at: new Date().toISOString(),
          sent_at: sentAt,
        }),
      });

      // A 403 means the app lacks the Buyer Solicitation role for this account; no point continuing.
      if (missingRole) { stopReason = "403 from Solicitations API (Buyer Solicitation role missing?)"; break; }
      await sleep(1100);
    }

    const summary = {
      account,
      mode,
      sendBlockedBy: wantSend && !liveSend
        ? [!globalEnabled && "REVIEW_REQUESTS_SEND_ENABLED not 'true'", !accountEnabled && "account not enabled in review_request_settings"].filter(Boolean)
        : undefined,
      region: cred.region,
      marketplaces: marketplaceIds.map((m) => MARKETPLACE_COUNTRY[m]),
      window: { purchasedAfter: createdAfter, purchasedBefore: createdBefore },
      ordersFetched: orders.length,
      ordersTruncated,
      orderErrors: orderErrors.length ? orderErrors : undefined,
      excluded,
      candidates: candidates.length,
      skippedRecentlyChecked: candidates.length - todo.length,
      checked,
      remaining: todo.length - checked,
      counts,
      byCountry,
      eligibleRate: checked ? Math.round((counts.eligible + counts.sent + counts.send_failed) / checked * 1000) / 10 : null,
      stopReason,
      seconds: Math.round((Date.now() - started) / 1000),
      runId,
    };

    await rest(`review_request_runs?run_id=eq.${runId}`, {
      method: "PATCH",
      body: JSON.stringify({ finished_at: new Date().toISOString(), summary }),
    });

    return json(summary);
  } catch (e) {
    return json({ error: String(e), seconds: Math.round((Date.now() - started) / 1000) }, 500);
  }
});
