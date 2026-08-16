-- ---------------------------------------------------------------------------
-- Tokenised access for client dashboard share links.
--
-- Until now /portwest/QQTCV opened Portwest's dashboard with nothing but a
-- 5-character share code in the path. The code is not a secret: it is printed
-- in every email, survives forwarding, and never expires. Anyone who saw it had
-- the account.
--
-- From here a share link must also carry ?t=<token>. The token is opaque, bound
-- to exactly one account, and dies after 60 days. It is deliberately REUSABLE
-- within that window — corporate link scanners (Outlook Safe Links, Mimecast,
-- Proofpoint) pre-fetch every URL in an inbound mail, so a single-use token
-- would be burned before the client ever clicked it.
--
-- The table itself is readable by nobody but service_role. Validation happens
-- through rpc_redeem_link_token, which is SECURITY DEFINER with a PINNED
-- search_path — an unpinned SECURITY DEFINER owned by postgres is a privilege
-- escalation hole, which is exactly how exec_sql had to be removed this morning.
-- ---------------------------------------------------------------------------

create table if not exists public.client_link_tokens (
  id           uuid primary key default gen_random_uuid(),
  -- 32 random bytes, base64url, 43 chars. Not a UUID: a UUIDv4 carries only 122
  -- bits and *looks* like an identifier people paste around, and gen_random_uuid
  -- is not guaranteed to be a CSPRNG on every build.
  token        text not null unique,
  account_id   uuid not null references public.accounts_master(id) on delete cascade,
  -- Which send this token belongs to, e.g. 'month-end 2026-07'. Lets a re-run of
  -- the email builder find and reuse the token it already posted.
  label        text not null default '',
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  use_count    integer not null default 0
);

create index if not exists client_link_tokens_account_label_idx
  on public.client_link_tokens (account_id, label, expires_at desc);

comment on table public.client_link_tokens is
  'Opaque, account-bound, time-limited tokens for client dashboard share links. Never exposed to anon; validated only via rpc_redeem_link_token.';

-- Fail closed. RLS on with no policies means no anon or authenticated row is
-- ever visible; the REVOKE is the second lock, because Supabase''s default
-- privileges hand anon and authenticated full DML on new public tables.
alter table public.client_link_tokens enable row level security;
revoke all on table public.client_link_tokens from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Redeem: the only way a browser may touch this table.
-- Returns at most one row — the single account the token grants — or nothing.
-- Nothing is returned for an unknown token, an expired token or a malformed
-- one, so the caller cannot tell those apart.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_redeem_link_token(p_token text)
returns table(account_id uuid, account_name text, share_code text)
language sql
volatile
security definer
set search_path = pg_catalog, public
as $function$
  with hit as (
    update public.client_link_tokens t
       set last_used_at = now(),
           use_count    = t.use_count + 1
     where t.token = btrim(coalesce(p_token, ''))
       and length(btrim(coalesce(p_token, ''))) >= 32
       and t.expires_at > now()
    returning t.account_id
  )
  select am.id, am.account_name, am.share_code
    from hit
    join public.accounts_master am on am.id = hit.account_id
   where am.status = 'active';
$function$;

revoke all on function public.rpc_redeem_link_token(text) from public;
grant execute on function public.rpc_redeem_link_token(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Mint: server-side only. The month-end email builder calls this once per
-- account per run with the service_role key.
--
-- Reuse rather than re-mint. A client who was sent July's link three weeks ago
-- must not have it silently replaced because the builder was run again; and
-- minting a fresh token on every run would leave a trail of live credentials
-- for one send. So an existing token for the same account+label is handed back
-- unchanged, provided it still has a week of life in it.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_mint_link_token(
  p_account_id uuid,
  p_label      text,
  p_ttl_days   integer default 60
)
returns table(token text, expires_at timestamptz, reused boolean)
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_label text := coalesce(p_label, '');
  v_ttl   integer := greatest(1, least(coalesce(p_ttl_days, 60), 365));
  v_row   public.client_link_tokens%rowtype;
begin
  if p_account_id is null then
    raise exception 'rpc_mint_link_token: p_account_id is required';
  end if;

  select * into v_row
    from public.client_link_tokens t
   where t.account_id = p_account_id
     and t.label = v_label
     and t.expires_at > now() + interval '7 days'
   order by t.expires_at desc
   limit 1;

  if found then
    return query select v_row.token, v_row.expires_at, true;
    return;
  end if;

  insert into public.client_link_tokens (token, account_id, label, expires_at)
  values (
    -- Fully qualified on purpose: search_path is pinned to pg_catalog+public,
    -- and pgcrypto lives in `extensions` on Supabase.
    translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_'),
    p_account_id,
    v_label,
    now() + make_interval(days => v_ttl)
  )
  returning * into v_row;

  return query select v_row.token, v_row.expires_at, false;
end;
$function$;

revoke all on function public.rpc_mint_link_token(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.rpc_mint_link_token(uuid, text, integer) to service_role;
