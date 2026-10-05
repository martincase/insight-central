# EV4 Dashboard — Build Handover Pack

**Client:** Workwear Depot UK (WWD), reselling Portwest EV4 range on Amazon UK
**Why:** Portwest is watching EV4 closely. Cameron needs one place that answers: *which EV4 styles are working for us, which are being taken by 3P sellers, which aren't ready, and what are ads and organic traffic doing for each.*
**Status of data:** audited against Insight Central (`wgrephgnrldsyipbvjco`) on 5 Oct 2026. Everything the MVP needs already lands in Supabase daily, so no new ingestion is required for v1.

---

## 1. Identifiers (WWD keys differ per table, so use these exactly)

| Where | Key | Value |
|---|---|---|
| `accounts_master` | `account_name` | `Workwear Depot UK` |
| `daily_asin_data` | `merchant_token` | `A3SSSDGOONKZCU-GB` |
| `listing_sku_asin_latest`, `perplexity_all_listings_stockprice_data`, FBA tables | `account_name` | `A3SSSDGOONKZCU-GB` (the token, not the name) |
| Ads tables | `profile_id` / `account_name` | `362497434794629` / `WWD - Workwear Depot` |
| Brand Analytics (`ba_*`) | `selling_partner_id` | `A3SSSDGOONKZCU` |

Ignore the US account `Workwear Depot` / `A3R7FAYWFJZ8JU-US`.

**EV4 scope:** any WWD SKU where `upper(seller_sku) like 'EV4%'`. **Style** = `substr(upper(seller_sku),1,5)`. There are currently 690 SKUs across 25 styles:
EV401 402 410 411 440 441 442 443 444 446 447 448 460 461 464 465 466 467 468 470 471 473 475 476 480.

**Live EV4 campaigns** (SP, £10/day each, started 28 Sep 2026, same 10 "cleared" styles: EV401 402 410 440 442 447 448 465 467 480):
- `266657102622493`, SP | WWD | Portwest EV4 | Auto | 10 cleared styles | MC 2026-09
- `29295389270064`, SP | WWD | Portwest EV4 | Manual KW | 10 cleared styles | MC 2026-09

Bid history: launched at £0.25. **Raised to £0.50 on 5 Oct 2026 ~11:10 UTC** (1,503 keywords, 40 auto targets, 20 ad-group defaults; `amazon_api_push_log` batch `babce8e3-dca9-4a3d-b3ff-44442f44c91b`). The dashboard should mark this date on the PPC charts.

---

## 2. Data sources

| Need | Table / view | Grain | Freshness | Notes |
|---|---|---|---|---|
| SKU → ASIN → style | `listing_sku_asin_latest (account_name, seller_sku, record_date, asin)` | SKU | daily (`listing-sku-asin-refresh-daily` 04:15) | Master list of EV4 SKUs. |
| Listing status, price, stock | `perplexity_all_listings_stockprice_data` (`item_name, status, price, quantity, fulfillment_channel`) | SKU / day | daily (spapi-listings-sync) | 4 Oct: 643 Active, 22 Inactive, 25 Incomplete. Use it for the **"not ready"** bucket. |
| Stock | `vw_current_stock_by_asin (fba_qty, fbm_qty, stock_qty, as_of)` | SKU | daily | EV4 is FBM (~103.8k units). FBA is 0. |
| **Organic traffic** (sessions, page views, buy box %, units, sales, CVR) | `daily_asin_data` | child ASIN / day (has `parent_asin`) | daily, through yesterday (spapi-asin-st-sync + `daily-asin-performance-sync` 16:30) | Sparse: a missing row means zero, so **zero-fill** in the view. 607 EV4 ASINs have history since Dec 2025. In the last 30 days ≈2,041 sessions, 1 unit and £147. |
| **Buy box owner** | `pw_buybox (asin, country_code, record_date, winner_seller_id, winner_class, buybox_price, is_fba, offer_count)` + `vw_pw_latest_buybox` | ASIN / day | every 30 min (`pw-buybox-drip`), GB since 10 Jul 2026 | `winner_class` ∈ wwd / amazon / competitor / nobody. Seller names come from `pw_seller_names (seller_id, name, klass)`. Covers only 384 of 690 EV4 ASINs (see gaps). |
| PPC by SKU | `amazon_api_advertised_product_performance` (`advertised_sku, advertised_asin, campaign_id, ad_group_id, date, impressions, clicks, spend, orders_7d, sales_7d`) | ad / day | daily 07:45 + reconcile jobs | `campaign_id` and `ad_id` are **text** here. |
| PPC by campaign | `amazon_api_campaigns_performance` | campaign / day | daily 07:30 | `campaign_id` is **bigint** here. |
| PPC by keyword / target | `amazon_api_targets_performance` | target / day | daily 07:40 | Filter by `campaign_id`. |
| Change log | `amazon_api_push_log` | change | on write | Chart annotations for bid and budget changes. |

**Not available today:** BSR and keyword rank for EV4. SQP (`ba_search_query_performance`) only covers WWD's top 15 sales ASINs, and none of them are EV4. `ba_search_catalog_performance` has EV4 data but has been stale since 31 May 2026.

---

## 3. Proposed database layer (create views; don't let the front end do joins)

Run these as one migration. Validate the column types (`campaign_id` text vs bigint) before applying.

```sql
-- 3.1 Master map: one row per EV4 SKU
create or replace view public.vw_ev4_sku as
select l.seller_sku                         as sku,
       l.asin,
       substr(upper(l.seller_sku),1,5)      as style,
       s.item_name, s.status, s.price, s.quantity,
       (substr(upper(l.seller_sku),1,5) in
        ('EV401','EV402','EV410','EV440','EV442','EV447','EV448','EV465','EV467','EV480')) as in_ads
from listing_sku_asin_latest l
left join lateral (
  select item_name, status, price, quantity
  from perplexity_all_listings_stockprice_data p
  where p.account_name = l.account_name and p.seller_sku = l.seller_sku
  order by p.record_date desc limit 1) s on true
where l.account_name = 'A3SSSDGOONKZCU-GB'
  and upper(l.seller_sku) like 'EV4%';

-- 3.2 Daily fact per ASIN: organic + PPC + buy box, zero-filled
create or replace view public.vw_ev4_asin_daily as
with asins as (select distinct asin, style from vw_ev4_sku),
days as (select generate_series(current_date - 90, current_date - 1, interval '1 day')::date d),
org as (
  select child_asin asin, record_date d, sum(sessions) sessions, sum(page_views) page_views,
         sum(units_sold) units, sum(sales) sales, avg(buy_box_percentage) bb_pct
  from daily_asin_data
  where merchant_token = 'A3SSSDGOONKZCU-GB' and record_date >= current_date - 90
  group by 1,2),
ppc as (
  select advertised_asin asin, date d, sum(impressions) impr, sum(clicks) clicks,
         sum(spend::numeric) spend, sum(orders_7d) ad_orders, sum(sales_7d::numeric) ad_sales
  from amazon_api_advertised_product_performance
  where profile_id = 362497434794629 and date >= current_date - 90
    and advertised_sku ilike 'EV4%'
  group by 1,2),
bb as (
  select asin, record_date d, max(winner_class) winner_class, max(winner_seller_id) winner_seller_id,
         max(buybox_price) bb_price, max(offer_count) offers
  from pw_buybox where country_code in ('GB','UK') and record_date >= current_date - 90
  group by 1,2)
select a.style, a.asin, days.d as date,
       coalesce(org.sessions,0) sessions, coalesce(org.page_views,0) page_views,
       coalesce(org.units,0) units, coalesce(org.sales,0) sales, org.bb_pct,
       coalesce(ppc.impr,0) impressions, coalesce(ppc.clicks,0) clicks, coalesce(ppc.spend,0) spend,
       coalesce(ppc.ad_orders,0) ad_orders, coalesce(ppc.ad_sales,0) ad_sales,
       bb.winner_class, bb.winner_seller_id, bb.bb_price, bb.offers
from asins a cross join days
left join org on org.asin = a.asin and org.d = days.d
left join ppc on ppc.asin = a.asin and ppc.d = days.d
left join bb  on bb.asin  = a.asin and bb.d  = days.d;

-- 3.3 Style scorecard (drives the main table) via RPC so the window is a parameter
create or replace function public.rpc_ev4_style_scorecard(p_days int default 14)
returns table (style text, skus int, asins int, active_skus int, stock bigint,
               bb_wwd int, bb_competitor int, bb_amazon int, bb_unchecked int,
               sessions bigint, page_views bigint, units bigint, sales numeric,
               impressions bigint, clicks bigint, spend numeric, ad_orders bigint, ad_sales numeric,
               status_bucket text)
language sql stable as $$
  with sku as (select * from vw_ev4_sku),
  latest_bb as (select distinct on (asin) asin, winner_class from pw_buybox
                where country_code in ('GB','UK') order by asin, record_date desc, checked_at desc),
  win as (select * from vw_ev4_asin_daily where date >= current_date - p_days),
  agg as (select style, sum(sessions) sessions, sum(page_views) page_views, sum(units) units, sum(sales) sales,
                 sum(impressions) impressions, sum(clicks) clicks, sum(spend) spend,
                 sum(ad_orders) ad_orders, sum(ad_sales) ad_sales
          from win group by style)
  select s.style, count(*)::int, count(distinct s.asin)::int,
         count(*) filter (where s.status ilike 'active')::int, coalesce(sum(s.quantity),0)::bigint,
         count(distinct s.asin) filter (where b.winner_class='wwd')::int,
         count(distinct s.asin) filter (where b.winner_class='competitor')::int,
         count(distinct s.asin) filter (where b.winner_class='amazon')::int,
         count(distinct s.asin) filter (where b.winner_class is null)::int,
         max(a.sessions), max(a.page_views), max(a.units), max(a.sales),
         max(a.impressions), max(a.clicks), max(a.spend), max(a.ad_orders), max(a.ad_sales),
         case
           when count(*) filter (where s.status ilike 'active') = 0 then 'Not ready'
           when count(distinct s.asin) filter (where b.winner_class='wwd')::numeric
                / nullif(count(distinct s.asin) filter (where b.winner_class is not null),0) >= 0.8 then 'Winning'
           when count(distinct s.asin) filter (where b.winner_class is not null) = 0 then 'Unchecked'
           else '3P / Amazon taking it'
         end
  from sku s left join latest_bb b on b.asin = s.asin left join agg a on a.style = s.style
  group by s.style order by s.style;
$$;
```

`status_bucket` maps directly to Cameron's ask: **Winning / 3P taking it / Not ready** (plus *Unchecked* until the buy-box gap is closed). Tune the 80% threshold with Martin.

---

## 4. Front end

Follow the existing **addon** pattern (no new routing needed for v1):

- Register in `src/addons/registry.ts` as `ev4`, a lazy `Section` that receives `AddonSectionProps` (`spid`, `merchantToken`, `dateFilter`, …). Copy the `budgets` addon as the template.
- Enable it for WWD only through `rpc_dashboard_addons`.
- Data hooks live in `src/hooks/useEv4.ts` and use `@tanstack/react-query` `useQuery` calling `supabase.rpc('rpc_ev4_style_scorecard', { p_days })` and `supabase.from('vw_ev4_asin_daily' as any)`, the same style as `useApiPpcData` and `useCurrentStockSnapshot`.
- Drill-down: an ASIN row links to the existing `/asin/:asin` (`src/pages/ASINHub.tsx`). Don't rebuild per-ASIN detail.
- Optional later: a standalone `/ev4` route in `src/App.tsx` inside `<AuthGate>`, or a `/:brandName/:shareId` shared view for Portwest/Cameron.

### Layout (top to bottom; KPIs first, per house style)

1. **KPI tiles** for the selected window (7 / 14 / 30 days):
   - EV4 sessions, units, sales
   - Ad spend, ad sales, ACOS
   - Styles Winning / 3P / Not ready
2. **Style scorecard table**, one row per style:
   - Columns: status chip, SKUs active/total, buy box WWD/3P/Amazon/unchecked, stock, sessions, page views, CVR, units, sales, impressions, clicks, spend, ad orders, ACOS, "in ads" flag.
   - Sortable and colour-coded by bucket. This is the table Cameron asked for.
3. **Trend chart**: daily sessions (organic) vs ad clicks vs spend for all of EV4 or a selected style. Annotate it from `amazon_api_push_log` (e.g. "Bids £0.25→£0.50, 5 Oct").
4. **Buy box panel**: per style, which seller holds each ASIN (name from `pw_seller_names`), the buy box price vs our price, and the offer count. Flag ASINs that flipped away from WWD in the last 7 days.
5. **Not ready list**: SKUs that are Inactive or Incomplete, or have no stock, plus the styles with no buy-box checks.
6. **Ads detail** (collapsible): top keywords / targets for the two EV4 campaigns from `amazon_api_targets_performance`, including clicks with no order.

---

## 5. Gaps to close (in priority order)

1. **Buy box coverage.** 306 EV4 ASINs aren't checked, and six whole styles have no checks at all: EV411, EV443, EV444, EV446, EV468, EV476. Seed the missing ASINs into the `pw-buybox-sync` target list. *Without this, those styles show as "Unchecked".*
2. **Organic rank.** There's no BSR or keyword rank for EV4. Options:
   - add EV4 parent ASINs to the Jungle Scout rank job (`wrz-js-rank-daily` / `jungle-scout-keywords-by-asin`)
   - run `searchapi-rank-check` on ~10 core terms ("work trousers", "hi vis trousers", "hi vis jacket", "portwest work trousers", …)
3. **SQP.** `ba-enqueue-sqp-weekly` picks WWD's top 15 sales ASINs, so EV4 never qualifies. Add an override list of EV4 parent ASINs.
4. **`ba_search_catalog_performance` stale since May.** Investigate the monthly pull. It would give search impressions/clicks/cart adds per EV4 ASIN.
5. **Session lag.** `daily_asin_data` runs about one day behind. Show "data to <date>" on the page.

---

## 6. Build checklist

- [ ] Apply the §3 views/RPC as a migration. Check `select * from rpc_ev4_style_scorecard(14)` returns 25 styles.
- [ ] Check row counts: `vw_ev4_sku` ≈ 690 rows. `vw_ev4_asin_daily` for the 10 ad styles should reproduce the campaign totals for 28 Sep–4 Oct (≈£11.6 spend to 2 Oct).
- [ ] Add `useEv4` hooks and the `ev4` addon section. Enable it for Workwear Depot UK.
- [ ] KPI tiles → scorecard → trend → buy box → not ready → ads detail.
- [ ] Bid-change annotations from `amazon_api_push_log`.
- [ ] Close gap 1 (buy-box seeding) before showing the page to Portwest.
- [ ] `npm run lint` and `npm run build` pass. Smoke-test in the app with WWD selected.

## 7. Acceptance

Cameron can open the page and, in under a minute, say for every EV4 style:
- whether WWD holds the buy box
- how many sessions it had this week
- whether ads are running and what they returned
- whether it's blocked by content or stock

Numbers must match Seller Central / the Ads console to within normal attribution lag.

## 8. Open questions for Martin

- The "Winning" threshold: is 80% of checked ASINs on WWD buy box right?
- Should Portwest get a share link (`/:brandName/:shareId`), or is it internal only?
- Should non-EV4 Portwest ranges follow later (make style prefix a parameter)?
