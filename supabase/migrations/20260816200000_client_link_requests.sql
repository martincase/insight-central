-- Self-service "send me a link" requests.
--
-- The refusal page on a client dashboard now lets the reader ask for a fresh
-- link themselves. That endpoint is anonymous by necessity, so it needs a
-- memory of who has asked recently — otherwise it is a free mailer aimed at
-- any address someone cares to type.
--
-- Nothing here identifies the requester. We keep a SHA-256 of the lowercased
-- address (and of the caller IP) purely so the hourly cap can be counted; the
-- submitted address itself is never retained, because most submissions will be
-- from people who are NOT on the whitelist and we have no business keeping
-- their addresses.

create table if not exists public.client_link_requests (
  id           uuid primary key default gen_random_uuid(),
  email_hash   text        not null,
  ip_hash      text,
  matched      boolean     not null default false,
  requested_at timestamptz not null default now()
);

comment on table public.client_link_requests is
  'Rate-limit ledger for the anonymous client-request-link endpoint. Hashes only — no addresses.';
comment on column public.client_link_requests.email_hash is
  'sha256(lower(trim(email))) hex. Not reversible; used only to count requests per hour.';
comment on column public.client_link_requests.matched is
  'Whether the address resolved to at least one active whitelisted account. For our own diagnostics.';

create index if not exists client_link_requests_email_idx
  on public.client_link_requests (email_hash, requested_at desc);
create index if not exists client_link_requests_ip_idx
  on public.client_link_requests (ip_hash, requested_at desc);

-- Service role only. The edge function holds the service key; nothing else may
-- read or write this table, and there are deliberately no policies.
alter table public.client_link_requests enable row level security;
revoke all on public.client_link_requests from anon, authenticated;
