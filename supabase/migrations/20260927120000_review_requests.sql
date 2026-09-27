-- Amazon "Request a Review" automation (SP-API Solicitations API).
-- Used by the spapi-review-requests edge function. Service role only: RLS on, no policies.

-- Per-client opt-in. Nothing is ever sent for an account unless enabled = true here
-- AND the function secret REVIEW_REQUESTS_SEND_ENABLED = 'true'.
create table if not exists public.review_request_settings (
  account_name text primary key,
  enabled boolean not null default false,
  notes text,
  updated_at timestamptz not null default now()
);

-- One row per order we have looked at. status:
--   eligible      Amazon says a request can be sent now (dry run: would have sent)
--   not_eligible  Amazon offers no review action for this order today (too early, too late, already sent, excluded)
--   sent          request sent (live mode only)
--   send_failed   live send returned an error
--   error         eligibility check failed
create table if not exists public.review_request_log (
  id bigserial primary key,
  account_name text not null,
  selling_partner_id text not null,
  marketplace_id text not null,
  amazon_order_id text not null,
  purchase_date timestamptz,
  latest_delivery_date timestamptz,
  fulfillment_channel text,
  status text not null,
  http_status int,
  detail jsonb,
  dry_run boolean not null default true,
  run_id uuid,
  checked_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (selling_partner_id, amazon_order_id)
);

create index if not exists review_request_log_account_status_idx
  on public.review_request_log (account_name, status);

create table if not exists public.review_request_runs (
  run_id uuid primary key default gen_random_uuid(),
  account_name text not null,
  mode text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb
);

alter table public.review_request_settings enable row level security;
alter table public.review_request_log enable row level security;
alter table public.review_request_runs enable row level security;
