-- Monthly Amazon Ads history imported from the Ads console, for periods the API can no
-- longer serve. Retention is 95 days for Sponsored Products, 65 for Display, 60 for Brands,
-- so anything older than that is unreachable through amazon-api-fetch-report and can only
-- arrive as a console export.
--
-- Deliberately separate from amazon_api_campaigns_performance, which is daily-grain.
-- Writing month totals into a daily table would mean inventing dates. Keeping them apart
-- lets a query use the API for recent daily detail and this for older history without
-- either pretending to be the other.
--
-- Grain is account x month. The first cut was campaign-grain (4,458 rows) but account x
-- month (265 rows) is the grain this data is used at - ACoS/TACoS reporting, month trends,
-- year-on-year - and 2025's campaigns have largely been rebuilt since. The source CSVs
-- remain the archive if campaign detail is ever needed.
--
-- attribution_window matters. The UK console report attributes on 14 days; the API's
-- sales_7d on 7. Spend is comparable across both, ad sales and ACoS are not. Portwest UK
-- reads ACoS 4.3% here against 4.7% from the API for the same period - same reality,
-- different window. Compare like with like, or stay within one source.

create table if not exists public.ads_monthly_history (
  id                 bigint generated always as identity primary key,
  account_name       text     not null,
  advertiser_id      text,
  country_code       text,
  currency           text     not null,
  year               smallint not null,
  month              smallint not null check (month between 1 and 12),
  impressions        bigint,
  clicks             bigint,
  spend              numeric(14,2),
  ad_sales           numeric(14,2),
  units_sold         integer,
  campaigns          integer,
  attribution_window text,
  source_file        text     not null,
  imported_at        timestamptz not null default now()
);

create unique index if not exists ads_monthly_history_unique_account_period
  on public.ads_monthly_history (account_name, currency, year, month);

create index if not exists ads_monthly_history_acct_period
  on public.ads_monthly_history (account_name, year, month);

alter table public.ads_monthly_history enable row level security;

comment on table public.ads_monthly_history is
  'Monthly Amazon Ads figures (account x month) imported from console exports, covering periods beyond API retention. Separate from the daily API tables by design. Check attribution_window before comparing ad sales or ACoS against API data: the UK export attributes on 14 days, the API sales_7d on 7. Spend is comparable across both.';

comment on column public.ads_monthly_history.campaigns is
  'Number of campaigns summed into this account-month row, from the source export.';
