
create or replace function public.rpc_set_cost_by_key(p_spid text, p_key text, p_cost numeric)
returns text
language plpgsql security definer set search_path = public as $$
declare v_brand text; v_asin text; v_key text := btrim(p_key);
begin
  select python_brand_name into v_brand from public.accounts_master
    where merchant_token like p_spid || '-%' and python_brand_name is not null limit 1;
  if v_brand is null then return 'no-brand'; end if;
  if v_key ~ '^[Bb]0[A-Za-z0-9]{8}$' then
    v_asin := upper(v_key);
  else
    select asin into v_asin from public.fin_seller_economics
      where selling_partner_id = p_spid and sku = v_key and asin is not null
      order by period_end desc limit 1;
    if v_asin is null then
      select asin into v_asin from public.perplexity_all_listings_stockprice_data
        where seller_sku = v_key and asin is not null order by record_date desc limit 1;
    end if;
  end if;
  if v_asin is null then return 'unmatched'; end if;
  insert into public.asin_cost_prices (brand, asin, cost_price, updated_by, updated_at)
    values (v_brand, v_asin, p_cost, 'bulk-upload', now())
    on conflict (brand, asin) do update set cost_price = excluded.cost_price, updated_by = 'bulk-upload', updated_at = now();
  return case when v_key ~ '^[Bb]0' then 'asin' else 'sku' end;
end $$;
grant execute on function public.rpc_set_cost_by_key(text,text,numeric) to anon, authenticated;
