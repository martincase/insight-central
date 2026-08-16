// client-request-link — a client asks for their own dashboard link.
//
// Since dashboard links started requiring ?t=<token>, an old or truncated link
// lands on a refusal page whose only remedy was "email hello@martincase.co.uk".
// This is that remedy, self-service: the reader types the address we already
// hold for them and we post back a working link.
//
// Deliberately NOT Supabase Auth magic links. auth.admin.generateLink() builds
// its URL from the project's Site URL, which is still localhost, so those links
// land nowhere. We mint one of our own link tokens instead (rpc_mint_link_token)
// and email a direct dashboard URL — no Auth involvement, nothing to configure.
//
// verify_jwt=false on purpose: this is a pre-login endpoint. Its protection is
// the whitelist (an unknown address gets nothing) plus an hourly cap per address
// and per caller IP.
//
// The response is byte-for-byte identical whether the address is on the list,
// is not on the list, is malformed, or has been rate-limited. Anything else
// turns this endpoint into a tool for confirming who our clients are.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** The one and only thing a caller is ever told. Never echoes the address back. */
const NEUTRAL = {
  ok: true,
  message: "If your address is on our list, we've sent you a link.",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const neutral = () => json(NEUTRAL, 200);

/** Same rule as normalizedBrandName() in src/utils/shareUtils.ts and dash_slug()
 *  in build_all_emails.py. Get this wrong and the brand check on the page
 *  refuses the link we just sent. */
const brandSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/** Deliberately loose — a malformed address simply gets the neutral reply. */
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254;

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// One address may be approved against more than one account (a group with two
// brands, say). We send ONE email listing every dashboard they can open rather
// than three separate emails — same click, less inbox noise, and it makes it
// obvious which link belongs to which brand.
interface LinkOut { name: string; url: string }

const buildEmail = (links: LinkOut[]) => {
  const single = links.length === 1;
  const subject = single ? "Your dashboard link" : "Your dashboard links";

  const listText = single
    ? links[0].url
    : links.map((l) => `${l.name}\n${l.url}`).join("\n\n");

  const text =
    `Hi,\n\n` +
    (single
      ? `Here is your link to the ${links[0].name} dashboard:\n\n${listText}\n\n`
      : `Here are your dashboard links:\n\n${listText}\n\n`) +
    `${single ? "It works" : "They work"} for the next 60 days. When ${single ? "it stops" : "they stop"} working, just ask for a new one from the same page.\n\n` +
    `If you didn't ask for this, you can ignore it — the link only opens your own dashboard.\n\n` +
    `Martin\n\n` +
    `Martin Case Limited\nhello@martincase.co.uk`;

  const listHtml = links
    .map((l) =>
      single
        ? `<p style="margin:0 0 16px"><a href="${escapeHtml(l.url)}">Open your dashboard</a></p>`
        : `<p style="margin:0 0 12px"><strong>${escapeHtml(l.name)}</strong><br><a href="${escapeHtml(l.url)}">${escapeHtml(l.url)}</a></p>`,
    )
    .join("");

  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1f2937">` +
    `<p style="margin:0 0 16px">Hi,</p>` +
    `<p style="margin:0 0 16px">` +
    (single
      ? `Here is your link to the ${escapeHtml(links[0].name)} dashboard:`
      : `Here are your dashboard links:`) +
    `</p>` +
    listHtml +
    (single
      ? `<p style="margin:0 0 16px;font-size:13px;color:#6b7280;word-break:break-all">${escapeHtml(links[0].url)}</p>`
      : "") +
    `<p style="margin:0 0 16px">${single ? "It works" : "They work"} for the next 60 days. When ${single ? "it stops" : "they stop"} working, just ask for a new one from the same page.</p>` +
    `<p style="margin:0 0 16px">If you didn't ask for this, you can ignore it — the link only opens your own dashboard.</p>` +
    `<p style="margin:0 0 16px">Martin</p>` +
    `<p style="margin:0;font-size:13px;color:#6b7280">Martin Case Limited<br>hello@martincase.co.uk</p>` +
    `</div>`;

  return { subject, text, html };
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const FROM = "Martin Case <hello@martincase.co.uk>";
  const BASE_URL = (Deno.env.get("DASHBOARD_PUBLIC_URL") ?? "https://martincase.app").replace(/\/+$/, "");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();

    // Which dashboard was the reader actually looking at? The refusal page passes
    // its own share code. We only ever send a link for THAT dashboard.
    //
    // Without this, asking from Portwest's page while whitelisted against AirCraft
    // posted back an AirCraft link — technically "your entitlements", but nobody
    // reads it that way. You ask about one dashboard, you get that one or nothing.
    const requestedShare = String(body?.share_code ?? "").trim();

    // A malformed address never reaches the database and never changes the reply.
    if (!looksLikeEmail(email)) return neutral();

    const emailHash = await sha256Hex(email);
    const rawIp =
      req.headers.get("cf-connecting-ip") ??
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const ipHash = rawIp ? await sha256Hex(rawIp) : null;

    const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Two caps, both hourly: 3 per address (a client who genuinely mislaid the
    // email needs one or two, not thirty) and 20 per IP (so one machine cannot
    // walk a list of addresses through us).
    const { count: emailCount } = await admin
      .from("client_link_requests")
      .select("id", { count: "exact", head: true })
      .eq("email_hash", emailHash)
      .gte("requested_at", sinceIso);
    if ((emailCount ?? 0) >= 3) return neutral();

    if (ipHash) {
      const { count: ipCount } = await admin
        .from("client_link_requests")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("requested_at", sinceIso);
      if ((ipCount ?? 0) >= 20) return neutral();
    }

    // Whitelist match, case-insensitively.
    //
    // Not .ilike(): an email address may legitimately contain '_' (Martin's own
    // does), which LIKE treats as "any single character" — mart_case@… would
    // then also match martXcase@…. The table is small; read it and compare in
    // code where the comparison means what it says.
    const { data: wl, error: wlErr } = await admin
      .from("client_email_whitelist")
      .select("account_id, approved_email")
      .limit(5000);
    if (wlErr) {
      console.error("[client-request-link] whitelist lookup failed:", wlErr.message);
      return neutral();
    }

    const accountIds = Array.from(
      new Set(
        (wl ?? [])
          .filter((r) => String(r.approved_email ?? "").trim().toLowerCase() === email)
          .map((r) => r.account_id as string)
          .filter(Boolean),
      ),
    );

    // Log the attempt whatever the outcome, so the caps count misses too.
    await admin
      .from("client_link_requests")
      .insert({ email_hash: emailHash, ip_hash: ipHash, matched: accountIds.length > 0 });

    if (accountIds.length === 0) return neutral();

    const { data: accounts, error: accErr } = await admin
      .from("accounts_master")
      .select("id, account_name, share_code, status")
      .in("id", accountIds);
    if (accErr) {
      console.error("[client-request-link] accounts lookup failed:", accErr.message);
      return neutral();
    }

    // Narrow to the dashboard that was asked about. An address entitled to several
    // accounts still only gets the one it requested; the others are reachable from
    // their own pages. Falls back to everything the address is entitled to only when
    // the caller supplied no context at all.
    const scoped = requestedShare
      ? (accounts ?? []).filter(
          (a) => String(a.share_code ?? "").trim().toLowerCase() === requestedShare.toLowerCase(),
        )
      : (accounts ?? []);

    const links: LinkOut[] = [];
    for (const acc of scoped) {
      // A closed account and a link-less account both get silently skipped —
      // rpc_redeem_link_token would refuse them anyway, so a link would only be
      // a promise the page then breaks.
      if (acc.status !== "active") continue;
      const code = String(acc.share_code ?? "").trim();
      if (!code) continue;
      const name = String(acc.account_name ?? "").trim();
      if (!name) continue;

      const { data: minted, error: mintErr } = await admin.rpc("rpc_mint_link_token", {
        p_account_id: acc.id,
        p_label: "self-service",
        p_ttl_days: 60,
      });
      const row: any = Array.isArray(minted) ? minted[0] : minted;
      if (mintErr || !row?.token) {
        console.error("[client-request-link] mint failed for", acc.id, mintErr?.message);
        continue;
      }

      links.push({
        name,
        url: `${BASE_URL}/${brandSlug(name)}/${encodeURIComponent(code)}?t=${encodeURIComponent(row.token)}`,
      });
    }

    if (links.length === 0) return neutral();

    if (!RESEND_API_KEY) {
      console.error("[client-request-link] RESEND_API_KEY missing — nothing sent.");
      return neutral();
    }

    const { subject, text, html } = buildEmail(links);
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [email], subject, text, html }),
    });
    if (!resp.ok) {
      // Still neutral to the caller — a send failure must not become a signal
      // that the address was recognised.
      console.error("[client-request-link] send failed:", resp.status, await resp.text());
    }

    return neutral();
  } catch (e) {
    console.error("[client-request-link] unexpected:", String(e));
    return neutral();
  }
});
