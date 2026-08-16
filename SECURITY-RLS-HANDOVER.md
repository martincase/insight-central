# Handover: Insight Central RLS remediation

**Written** 2026-08-09 · **Project** `wgrephgnrldsyipbvjco` (Insight Central, production)
**Status** Investigated, nothing changed. No migrations applied.

---

## The job

The Supabase `anon` key ships inside every client bundle (Vite bakes `VITE_*` vars into
the JS). That key currently grants far more than read access to a 358-table production
database. Close that down without breaking the dashboards and pipelines that depend on it.

## What was verified (2026-08-09)

Run these to reproduce — do not trust this document without re-checking, the estate moves.

**1. RLS coverage**
```sql
select count(*) filter (where c.relrowsecurity) as rls_on,
       count(*) filter (where not c.relrowsecurity) as rls_off,
       count(*) as total
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r';
```
Result: **314 on, 44 off, 358 total.**

**2. What the existing policies actually permit**
```sql
select roles::text, cmd, qual, count(*)
from pg_policies where schemaname='public'
group by 1,2,3 order by 4 desc limit 15;
```
Result — the top five, all with `qual = true` (no restriction):

| Granted to | Command | Count |
|---|---|---|
| `public` | ALL | 63 |
| `public` | SELECT | 46 |
| `anon`,`authenticated` | SELECT | 44 |
| `anon`,`authenticated` | ALL | 42 |
| `anon` | ALL | 30 |

`ALL` includes INSERT/UPDATE/**DELETE**. So RLS is enabled and then told to allow
everything. Policy names confirm intent: "Allow anon full access", "Anyone can manage…".

**3. A real bug worth fixing first**
Several policies are *named* `service_role_all` but granted to `public` — e.g.
`amazon_api_campaigns_config`, `amazon_api_campaigns_performance`,
`amazon_api_ads_performance`, `amazon_api_ad_groups_performance`. Intent was
service-role-only. These are quick, low-risk wins: they should never have been public.

**4. Supabase advisor** (`get_advisors(project_id, type='security')` — output is ~560 KB,
parse it, don't read it whole):
- 44 `rls_disabled_in_public` (ERROR)
- 101 `security_definer_view` (ERROR) — run as creator, bypass caller's RLS
- 73 `rls_enabled_no_policy` (INFO) — these **deny all**, they are the safe ones
- 166 + 159 security-definer functions executable by `authenticated` / `anon`

The 44 RLS-off tables include `insight_central_feedback`, `catalog_content_export`,
`vendor_daily_metrics`, `ads_client_map`, `ni_v2_*`, `pw_mkt_*`, `sw_pools`.
Full list: re-run the advisor.

## Why "just turn RLS on" breaks everything

- **Edge functions use `service_role`, which bypasses RLS entirely.** They are safe.
- **The dashboards connect as `anon`.** Every table they read needs a deliberate SELECT
  policy or the UI goes blank — silently, with empty arrays, not errors.
- **Ops Wall** (`ops.martincase.app`) reads `fathom_*`, `client_email_status`,
  `ops_inbox_pulse`, `account_health_status`, `xero_sync_log`, `ops_calendar_pulse`,
  `ops_wall_notes`, and four `vw_ops_*` **security-definer** views.
- **Insight Central** is client-facing on `martincase.app`. Its login (whitelist +
  tokenised email link, no passwords) is still being built — see
  `[[insight-central-phase2-auth]]`. Until users are real authenticated identities,
  per-client row filtering has nothing to filter *on*.
- **Hugo, the ads engines, month-end** all read this project.

That last point is the crux: **you cannot write "clients see only their own rows" until
there is a logged-in identity to key it to.** Sequencing matters more than speed here.

## Suggested staging

1. **Kill the mislabelled `service_role_all`-to-`public` policies.** Pure win, no UI reads
   these tables directly. Verify each with a `service_role` smoke test.
2. **Downgrade write access.** Convert `ALL`-to-`anon` into `SELECT`-only wherever the app
   only reads. Check the code first — the feedback widget and `ops_wall_notes` genuinely
   need INSERT. This removes the delete-your-database risk while changing nothing visible.
3. **Enable RLS on the 44 bare tables**, each with an explicit SELECT policy matching
   current behaviour. No behaviour change, just makes the permission explicit.
4. **The 101 definer views** — decide per view whether it should be `security_invoker`.
   Do this AFTER the underlying tables are right.
5. **Per-client row filtering** — blocked until Phase 2 auth ships. Design it alongside
   that, not before.

Steps 1–3 are safe and reversible. Step 4 needs care. Step 5 is a different project.

## Rules for whoever picks this up

- **Never apply a migration to all 44 tables in one go.** Batch it, verify the dashboards
  between batches.
- **After every batch**, load `ops.martincase.app` and Insight Central and confirm data
  still renders. An RLS break shows up as empty panels, not error messages.
- **Take a backup / use a branch first.** `create_branch` on the Supabase MCP exists.
- Martin has a standing preference: **no invented numbers, verify before asserting**
  (`[[no-assumptions-in-analysis]]`). Re-run the queries rather than citing this doc.
- Cloudflare Access is NOT a mitigation. It protects the page; the Supabase API is a
  separate front door on `supabase.co`.

## Step 1 APPLIED — 2026-08-09

Four migrations, `rls_step1a_*` … `rls_step1d_*`. Policy DDL only; no DML, no data removed
(row counts re-checked before and after on every table touched — all identical).

**Corrections to this document, found by re-verification:**
- The mislabelled set is **24 policies**, not the four named above. A 25th
  (`ChatGPT_API_keyword_relevance` / "Service role bypass") is *correctly* restricted by its
  `qual` despite being granted to `public` — leave it alone.
- **"No UI reads these tables directly" was wrong.** `amazon_api_campaigns_performance` is
  read from the browser in `src/hooks/useApiPpcData.ts:122` and
  `src/components/dashboard/ChangeMarkerComparison.tsx:49`. Its only policy was the
  mislabelled one, so a straight drop would have blanked the PPC panels.
- `jungle_scout_research_sessions` needs browser **INSERT and UPDATE**
  (`ResearchLauncher.tsx:41`, `FullResearchPipeline.tsx:101` and `:225`) — add it to the
  step-2 list of genuine writers alongside the feedback widget and `ops_wall_notes`.
- All 11 views over these tables are **security-definer**, so Ops Wall was never at risk.
- `service_role` has `rolbypassrls = true` — the replacement `to service_role` policies are
  declarative only. Verified, and it underwrites the whole remediation.

**Net effect:** anon/authenticated keep SELECT on every table they had it on; INSERT,
UPDATE and DELETE are revoked everywhere except the two verbs restored above. Before this,
an anon DELETE would have emptied these tables — that is now proven blocked (0 rows).

**Read tightening deliberately NOT done.** Martin flagged (2026-08-09) that numerous
**Lovable** apps read these tables as `anon` and are invisible from this repo and from the
24h API log. Reads were restored on the 18 tables where they had briefly been closed.
Do not close a read until its Lovable consumers are enumerated. Insight Central itself is
out of scope for that audit — it has moved to Cloudflare.

## Steps 2, 3, 4 APPLIED — 2026-08-09 (overnight, unattended)

Migrations `rls_step1e_*`, `rls_step2a/b/c_*`, `rls_step3a/b_*`, `rls_step4a/b/c_*`.
Every batch was verified by probing each object **as the `anon` role** before and after and
comparing visible row counts. Read regressions across all batches: **0**.

**Step 2 — writes revoked.** 89 unrestricted `ALL` policies across 87 tables replaced with
`SELECT`-only, preserving each policy's original role set. 31 `ALL` policies across 28
tables deliberately retained — the evidenced writers (see the keep-write list below).

**Step 3 — RLS enabled on all 44 bare tables**, each with an explicit
`anon, authenticated SELECT` policy matching prior behaviour plus a real `service_role`
policy. Writes preserved only on `insight_central_feedback` and `WM_feedback`.
`rls_disabled_in_public` is now **0**.

**Step 4 — definer views 114 → 33.** 81 flipped to `security_invoker`. The flip was applied
then measured as `anon`, and **any view that lost rows was automatically reverted** — 33
reverted themselves. Those 33 are load-bearing: they are how `anon` reaches data in tables
that intentionally do not grant anon read (e.g. `daily_asin_data` is `authenticated`-only).
Converting them requires per-view redesign, not a flag flip. Notable ones still definer:
`vw_keyword_priority`, `vw_python_financial_weekly`, `WM_buybox_trend`, the `vw_pw_*` family.

### The keep-write list (do not revoke without re-checking the consumer)

Evidence: grep of the insight-central + ops-wall repos, a sweep of the Python scripts, and
a read-only audit of all 107 Lovable projects.

| Source | Tables |
|---|---|
| Insight Central browser | `account_change_marker`, `account_tags`, `accounts_master`, `asin_cost_prices`, `brand_marketplaces`, `client_feature_visibility`, `dashboard_events`, `insight_central_feedback`, `jungle_scout_competitors`, `jungle_scout_research_sessions`, `negative_keyword_config`, `pending_negatives`, `roadmap_items`, `searchapi_cache`, `xero_account_mapping` |
| Ops Wall | `ops_wall_notes` |
| Python `push_to_supabase.py` (uses the **anon** key) | `pending_negatives`, `python_keyword_master`, `python_financial_raw` |
| Hugo's Command Center | `hugo_config`, `hugo_pending_actions`, `hugo_skill_routing`, `hugo_draft_skills`, `hugo_settings`, `hugo_feedback` |
| sunshine-bid-pilot | `sunshine_campaigns`, `sunshine_competitor_keywords`, `competitor_watchlists`, `competitor_bid_recommendations`, `competitor_events` |
| brandwatch-tracker | `WM_watch_asins`, `WM_alerts`, `WM_feedback` |
| Apex Orchestrator | `apex_asin_runs`, `apex_prompts`, `insight_central_feedback` |
| Lockabox Command Center | `lockabox_war_targets`, `lockabox_war_core_keywords` |
| AI Rank Watch | `ai_rank_queries`, `ai_rank_annotations`, `ai_rank_query_suggestions`, `ai_rank_recommendations` |
| Bestseller Insights | `bestseller_config`, `bestseller_benchmarks` |

### Lovable audit result

107 projects across both workspaces. **10 connect to this database**, all with the anon key:
`amazon-insight-central`, `Hugo's Command Center`, `sunshine-bid-pilot`, `brandwatch-tracker`,
`Apex Orchestrator`, `Lockabox Command Center`, `AI Rank Watch`, `Bestseller Insights`,
`Portwest Stock Shield`, `Bello Workflow Studio`. The other 97 either have no Supabase client
at all or point at their own separate project ref.

`sunshine-bid-pilot` is the highest-risk consumer — it touches 9 of the 24 step-1 tables and
writes to 3 from the browser.

### Known-open items (NOT fixed, deliberately)

- **`python_financial_raw` has RLS on and NO policy** — pre-existing, predates this work.
  `push_to_supabase.py` upserts it with the anon key, so that write has been failing
  silently. Not opened up: it is financial data and granting anon write is Martin's call.
- **`vw_pw_style_health` cannot serve an API request** — 38.8s execution *as superuser with
  RLS bypassed*, from a seq scan of 5.2M `vendor_daily_metrics` rows and a 214MB external
  sort. Pre-existing; Portwest Stock Shield reads it. Needs an index or a materialised view.
- **33 security-definer views remain** (see above) — each needs a per-view decision.
- **Step 5, per-client row filtering** — still blocked on Phase 2 auth.
- The anon JWT is hardcoded in the Lovable apps in **three different vintages**, including
  one in a raw fetch in `sniper/Watchlists.tsx`. Rotation would break those silently.
- `asinhub-central` ships this project's URL + anon key in a published bundle but never
  uses them — free cleanup, delete the two `.env` lines.

## Function EXECUTE lockdown — 2026-08-10

**138 functions had EXECUTE revoked from `PUBLIC`/`anon`/`authenticated`**, with `service_role`
granted back explicitly (257/257 functions still executable by `service_role`, verified).
Trigger functions were excluded — Postgres does not check EXECUTE at trigger fire time.

Why it mattered: these were granted to **PUBLIC**, so revoking from `anon` alone would have
done nothing. Several were VOLATILE and callable by anyone holding the published anon key —
`ai_rank_fire_*`, `hugo_fire_next`, `windsor_fire_*`, `run_pipeline_alarm`. That was an
*action* hole, not a read hole. Only `wm_scan_dispatch` remains anon-callable, correctly:
brandwatch-tracker's "Run scan now" button calls it.

**Two traps this exposed — read before repeating this work:**

1. **`grep '\.rpc('` undercounts badly.** Insight Central writes many calls as
   `(supabase.rpc as any)('name')`. The naive pattern found 16; the real number is 37. It
   missed `is_staff`, which gates `/admin`, `/agency` and `/feedback`, plus the whole P&L,
   budgets and brand-analytics surface. Use `rpc[^(]{0,20}\(\s*['"]`.
2. **The keep-list must include functions called inside VIEW definitions**, not just `.rpc()`
   call sites. `to_gbp`, `pp_num`, `pw_*`, `wm_*` and `fn_ads_retention_start` are helpers
   used inside anon-readable views; revoking them broke `vw_ops_ads_pulse`,
   `vw_ops_finance_pulse` and `vw_python_financial_weekly`. Restored.

### UNRESOLVED — live SSRF, needs privileges we do not have

`public.http_get` / `http_post` (extension `http`) and the `net.*` functions are executable
by `anon` and **confirmed callable through the REST API**: a POST to
`/rest/v1/rpc/http_get` with `{"uri":"http://127.0.0.1:9/"}` returns a *connection* error,
not a permission error — the database performed the request. Anyone with the published anon
key can make the database issue arbitrary outbound HTTP requests.

Cannot be fixed from the `postgres` role: the extension is owned by `supabase_admin`,
`REVOKE` fails silently and `ALTER EXTENSION http SET SCHEMA extensions` is denied.
Routes to fix: (a) relocate the extension via the Supabase dashboard — but 31 pipeline
functions call `http_*` (windsor_*, month-end preflight, daily syncs) and would need
`extensions` on their search_path; (b) Supabase support; (c) the Cloudflare Worker proxy,
which closes it as a side effect once `anon` is revoked wholesale.

### Also done
- `cron.job_run_details` pruned 430,479 → 61,070 rows (7-day retention). Supabase docs
  require this before an upgrade or it can fail.
- 10 unused materialized views: revoke attempted and **reverted**. Because 81 views are now
  `security_invoker`, revoking the MV grant broke every invoker view built over them —
  `vw_ops_client_pulse` (Ops Wall), `sw_pool_timeline`, `sw_recovery_curve`,
  `sw_episode_impact`, `vw_asin_titles`, `vw_sales_daily_country`. The grants are
  load-bearing now. Do not retry without converting those views back to definer first.

### Postgres upgrade
DB is **28 GB**; Supabase's documented `pg_upgrade` rate is ~100 MB/s → **≈5 minutes** of
downtime, book 30 for validation. Current version `supabase-postgres-17.4.1.074`, so this is
a patch upgrade within 17 — the plv8/timescaledb blockers do not apply. Trigger it from
Dashboard → Infrastructure.

## Step 5 — write half, second pass — APPLIED 2026-08-16

Scope was **writes only**. No SELECT policy, SELECT grant or view was touched.

**Anon-writable public tables: 69 before → 56 after** (the brief's "140 of 370" was the
pre-step-1 figure; steps 1–4 had already taken it to 69). `rls_disabled_in_public` back to **0**.

Note: `ChatGPT_API_keyword_relevance` shows up in a naive scan as anon-writable but its
`qual` is `auth.role() = 'service_role'`, so it is not. Filter on the qual or you will
chase it every time.

### Migration `rls_step5a_revoke_anon_writes_bulk_pipeline_tables`

10 write policies dropped across 8 tables. Every one was **command-specific**
(INSERT/UPDATE), never `ALL`, so dropping them was structurally incapable of touching
SELECT. Verified anyway: 16-object anon row-count probe before and after, **0 regressions**,
plus a rolled-back anon INSERT probe returning `BLOCKED` on all five readable tables.

| Table | Revoked | Evidence nothing legitimate wrote it |
|---|---|---|
| `daily_vendor_data` | anon INSERT + UPDATE | 437k-row bulk vendor feed. All 6 `src` references are `.select()` (hooks, fetchers, MonthlyPerformanceView). Written by the vendor pipeline on service_role. |
| `client_threshold_alerts` | public INSERT + UPDATE | Policies literally named "System can insert/update alerts" but granted `public` — same mislabelling bug as step 1. Browser only SELECTs (`CollapsibleAlerts.tsx:46`, `ClientAlertsCard.tsx:44`). |
| `jungle_scout_asin_relevance_scores` | public INSERT | No `src` reference outside generated `types.ts`. Written by the relevance edge function. |
| `jungle_scout_keyword_relevance_scores` | public INSERT | Both `src` references (`FullResearchPipeline.tsx:286`, `KeywordRelevanceScoring.tsx:73`) are `.select()`. |
| `NK_SB Multi Ad Group Campaigns` | public INSERT | Legacy ad-report import. No SELECT policy even exists (anon cannot read it). Not referenced in `src`. |
| `NK_SP Search Term Report` | public INSERT | 265k rows, legacy import. Only reference is a type alias in `src/types/dashboard.ts`. |
| `NK_Sponsored Brands campaigns` | public INSERT | As above; no SELECT policy, not referenced. |
| `NK_Sponsored Products Campaigns` | public INSERT | 327k rows; as above. |

**Revert 5a:**
```sql
create policy "Allow anon insert" on public.daily_vendor_data
  for insert to anon with check (true);
create policy "Allow anon update" on public.daily_vendor_data
  for update to anon using (true) with check (true);
create policy "System can insert alerts" on public.client_threshold_alerts
  for insert to public with check (true);
create policy "System can update alerts" on public.client_threshold_alerts
  for update to public using (true);
create policy "Allow public insert access" on public.jungle_scout_asin_relevance_scores
  for insert to public with check (true);
create policy "Allow public insert access" on public.jungle_scout_keyword_relevance_scores
  for insert to public with check (true);
create policy "INSERT" on public."NK_SB Multi Ad Group Campaigns"
  for insert to public with check (true);
create policy "Insert"  on public."NK_SP Search Term Report"
  for insert to public with check (true);
create policy "INSERT" on public."NK_Sponsored Brands campaigns"
  for insert to public with check (true);
create policy "INSERT" on public."NK_Sponsored Products Campaigns"
  for insert to public with check (true);
```

### Migration `rls_step5b_enable_rls_on_four_bare_tables`

Four tables **created after the 2026-08-09 sweep** had RLS off and no policies, so anon held
full INSERT/UPDATE/DELETE through the default grants. This is a recurring leak: **any new
table defaults to anon-writable.** Re-run the inventory after every schema addition.

`month_end_ads_confirmed_zero`, `top24_monday_state`, `top24_sheet_rows`,
`top24_weekly_email_log` — month-end / TOG24 backend job artefacts (email log, monday-state
marker, sheet rows). Not referenced anywhere in `src` (not even in `types.ts`), not among the
10 known Lovable consumers' tables, and no dependent views exist. Written by service_role.

RLS enabled + an explicit `anon, authenticated SELECT using (true)` policy so reads are
byte-identical. Verified as anon: reads 2/1/10/1 before and after, writes `BLOCKED`.

**Revert 5b:**
```sql
drop policy if exists "anon_auth_select" on public.month_end_ads_confirmed_zero;
alter table public.month_end_ads_confirmed_zero disable row level security;
drop policy if exists "anon_auth_select" on public.top24_monday_state;
alter table public.top24_monday_state disable row level security;
drop policy if exists "anon_auth_select" on public.top24_sheet_rows;
alter table public.top24_sheet_rows disable row level security;
drop policy if exists "anon_auth_select" on public.top24_weekly_email_log;
alter table public.top24_weekly_email_log disable row level security;
```

### Left open deliberately — 56 tables

All of the step-1–4 keep-write list still stands, re-confirmed by grep of
`insight-central/src` (the 15-table browser list reproduced exactly). Plus:

- **The internal planner family** — `content_tracker`, `content_schedule`, `project_schedule`,
  `blocked_days`, `client_deliverables`, `gemma_allocation_config`. These looked like dead
  bulk tables, but sampling `content_tracker` shows hand-entered agency work rows
  (`completed_by: "Martin"`, status In Progress/Done, client names). **A browser writes
  these.** The owning app is *not* Insight Central (references are `types.ts`-only), not Bello
  Workflow Studio (that only touches `bello_*`, via an edge function, and is unpublished), and
  no Lovable project matches on name or description. **Unidentified consumer — find it before
  closing these.**
- `steady_opt_accounts`, `steady_opt_config` — live PATCH traffic in the 24h edge log.
- `fathom_meetings`, `fathom_action_items`, `fathom_meeting_client_map` — 558 PATCH + 89 POST
  in 24h.
- `sw_settings` — UPDATE-only with a real CHECK on `lead_time_days`/`cover_weeks`; that is a
  UI settings form, almost certainly Portwest Stock Shield.
- `WM_reorder_box_qty`, `WM_reorder_order_log`, `WM_reorder_recommendations`,
  `WM_reorder_settings` — the AWM reorder dashboard; narrow, UI-shaped write policies.
- `sunshine_competitor_targets` — sunshine-bid-pilot family, the highest-risk consumer.
- `python_financial_raw` — untouched, Martin's call.

### Could not verify
Role attribution. The edge log records method and path but not whether the caller presented
the anon or the service key, so **absence of write traffic is weak evidence** for an
infrequently-used Lovable app, and the window is only 24h. Everything closed above rests on
source-code evidence and table character, not on log silence alone. `pg_stat_user_tables`
counters were reset ~2026-08-10 and are useless for tables older than that.

## Answered by Martin, 2026-08-09

1. **Brief breakage is acceptable.** Work directly on production; no Supabase branch
   needed. Still batch the changes and check the dashboards between batches — the point
   is to notice a break, not to avoid one at all costs.
2. **Do not rotate the anon key.** Martin's call, judged low risk. Residual: the key has
   been in published bundles for a long time and anyone who took a copy keeps whatever
   access the policies allow. This is exactly why steps 1–3 matter — tightening the
   policies is what devalues an already-copied key. Revisit rotation only if there is
   evidence of misuse.
3. **No known third-party consumers** of the anon key beyond the known apps. Treat as
   probable, not certain — if something breaks after a policy change, an unknown consumer
   is the first thing to suspect.
