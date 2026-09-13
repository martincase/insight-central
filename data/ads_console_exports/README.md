# Amazon Ads console exports

Monthly Ads figures for periods the Amazon Ads API can no longer serve. Retention is
95 days for Sponsored Products, 65 for Display and 60 for Brands, so anything older
than that only ever arrives as a manual console export.

Loaded into `ads_monthly_history` (see the migration of the same date). 265 account-months
covering 2025-01 to 2026-09 across 12 accounts.

## Files

| File | Contents |
|---|---|
| `Portwest_Reports_2025-2026_all_accounts.csv` | All vendor and seller accounts **except** Portwest UK, which sits under a separate advertiser account |
| `Portwest_UK_SP_Campaign_report_2025-2026.csv` | Portwest UK Sponsored Products only |
| `20260913_ads_monthly_history_backfill.sql` | The generated upsert actually run against the database |

## Exporting these again

The multi-account report **must have the Year dimension ticked**. A first export had only
Month, and with a range spanning two years Amazon summed 2025 and 2026 into one bucket per
month - every (account, campaign, month) key appeared exactly once across 20 months. That
file was unusable and was not loaded.

Portwest UK has to be requested separately; it is not in the multi-account advertiser list.

## Verification done on import

* Every account, row count and spend total was checked against totals computed
  independently from the CSVs. All matched to the penny.
* Portwest UK 2025-12 and 2026-01 match the API figures exactly.
* Portwest UK 2026-03 is GBP 612 higher than the API, which is precisely the
  2026-03-12 day the API is missing.

## Two traps

**Attribution.** The UK report attributes on 14 days, the API's `sales_7d` on 7. Spend is
comparable, ad sales and ACoS are not - UK reads 4.3% here against 4.7% from the API for
the same period. Stay within one source when comparing.

**Account naming.** The console calls the US vendor advertiser account *Portwest USA*;
the Ads API calls the same account *Portwest -Industrial* (profile 3529318683273502).
`ads_monthly_history` uses the console name, which matches `vendor_daily_metrics`.
