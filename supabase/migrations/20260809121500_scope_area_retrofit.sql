-- =====================================================================
-- Teach the not-yet-client-aware RPCs to ignore the arm suffix
-- =====================================================================
--
-- Fourteen RPCs (P&L, Budgets, Brand Analytics, vendor timeseries) resolve
-- scope with their own inline
--
--     p_scope = 'ALL' or (p_scope = 'ALL_EU' and region = 'EU')
--                     or country_code = p_scope
--
-- against a SINGLE selling_partner_id. They never had brand widening, let
-- alone client widening. Handed the new 'GB#Vendor' form they would compare
-- country_code against the literal 'GB#Vendor', match nothing, and render an
-- empty panel — a silent blank, which is the worst possible failure.
--
-- They are deliberately NOT being widened to the client here: fin_seller_economics
-- and ba_* only exist for the seller arm, so a client-wide P&L would be a
-- seller number wearing a whole-business label. What they need is simply to
-- read the country part and ignore the arm, which is exactly what these panels
-- already mean.
--
-- Applied mechanically rather than by hand-rewriting fourteen bodies: every
-- p_scope reference inside each body becomes public.scope_area(p_scope). The
-- guard makes it a no-op on anything already converted, and on the six RPCs
-- that go through brand_scope_accounts (which handles the arm itself).
-- =====================================================================

do $do$
declare
  r record; def text; a int; head text; tail text; n int := 0;
begin
  for r in
    select p.oid, p.proname
    from pg_proc p join pg_namespace nsp on nsp.oid = p.pronamespace
    where nsp.nspname = 'public' and p.prokind = 'f'
      and p.prosrc like '%p_scope%'
      and p.prosrc not like '%brand_scope_accounts%'
      and p.prosrc not like '%scope_area%'
      and p.proname not in ('scope_area','scope_arm')
  loop
    def := pg_get_functiondef(r.oid);
    a := position('AS $function$' in def);
    if a = 0 then
      raise notice 'SKIPPED (unexpected dollar-quote tag): %', r.proname;
      continue;
    end if;
    head := substr(def, 1, a + 12);          -- everything up to and including AS $function$
    tail := substr(def, a + 13);             -- the body plus its closing tag
    tail := regexp_replace(tail, '\mp_scope\M', 'public.scope_area(p_scope)', 'g');
    execute head || tail;
    n := n + 1;
    raise notice 'patched %', r.proname;
  end loop;
  raise notice 'scope_area retrofit: % function(s)', n;
end
$do$;
