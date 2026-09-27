begin;

alter table public.products
  add column if not exists price_source_url_usd text,
  add column if not exists price_source_url_eur text,
  add column if not exists price_checked_at_usd date,
  add column if not exists price_checked_at_eur date,
  add column if not exists prices_updated_at timestamp with time zone,
  add column if not exists prices_updated_by uuid;

alter table public.products
  drop constraint if exists products_prices_non_negative_check;

alter table public.products
  add constraint products_prices_non_negative_check check (
    (price_base_usd is null or (price_base_usd >= 0 and price_base_usd <= 10000000))
    and (price_base_eur is null or (price_base_eur >= 0 and price_base_eur <= 10000000))
    and (price_usd is null or (price_usd >= 0 and price_usd <= 10000000))
    and (price_eur is null or (price_eur >= 0 and price_eur <= 10000000))
  );

alter table public.products
  drop constraint if exists products_price_source_urls_check;

alter table public.products
  add constraint products_price_source_urls_check check (
    (price_source_url_usd is null or price_source_url_usd ~* '^https?://[^[:space:]]+$')
    and (price_source_url_eur is null or price_source_url_eur ~* '^https?://[^[:space:]]+$')
  );

alter table public.products
  drop constraint if exists products_prices_updated_by_fkey;

alter table public.products
  add constraint products_prices_updated_by_fkey
  foreign key (prices_updated_by) references auth.users(id) on delete set null;

alter table public.products
  alter column price_source_url_usd drop default,
  alter column price_source_url_eur drop default;

revoke insert, update, delete, truncate on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;

revoke insert, update, delete, truncate on public.products_with_priority from anon, authenticated;
grant select on public.products_with_priority to anon, authenticated;
alter view public.products_with_priority set (security_invoker = true);

create or replace function public.update_catalog_product_prices(
  p_admin_user_id uuid,
  p_updates jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog, public, auth'
as $function$
declare
  v_update jsonb;
  v_id text;
  v_price_base_usd numeric;
  v_price_base_eur numeric;
  v_price_usd numeric;
  v_price_eur numeric;
  v_source_url_usd text;
  v_source_url_eur text;
  v_checked_at_usd date;
  v_checked_at_eur date;
  v_updated_ids jsonb := '[]'::jsonb;
  v_is_admin boolean;
begin
  if p_admin_user_id is null
    or p_updates is null
    or jsonb_typeof(p_updates) <> 'array'
    or jsonb_array_length(p_updates) < 1
    or jsonb_array_length(p_updates) > 100 then
    raise exception 'El lote de precios no es válido' using errcode = '22023';
  end if;

  select exists (
    select 1
    from auth.users
    where id = p_admin_user_id
      and raw_app_meta_data ->> 'role' = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'El usuario no tiene permisos de administrador' using errcode = '42501';
  end if;

  for v_update in select value from jsonb_array_elements(p_updates)
  loop
    if jsonb_typeof(v_update) <> 'object' then
      raise exception 'Cada actualización debe ser un objeto' using errcode = '22023';
    end if;

    v_id := nullif(trim(v_update ->> 'id'), '');
    if v_id is null or length(v_id) > 200 then
      raise exception 'El producto no es válido' using errcode = '22023';
    end if;

    if jsonb_typeof(v_update -> 'price_base_usd') not in ('number', 'null')
      or jsonb_typeof(v_update -> 'price_base_eur') not in ('number', 'null')
      or jsonb_typeof(v_update -> 'price_usd') not in ('number', 'null')
      or jsonb_typeof(v_update -> 'price_eur') not in ('number', 'null') then
      raise exception 'Los precios deben ser números o estar vacíos' using errcode = '22023';
    end if;

    v_price_base_usd := (v_update ->> 'price_base_usd')::numeric;
    v_price_base_eur := (v_update ->> 'price_base_eur')::numeric;
    v_price_usd := (v_update ->> 'price_usd')::numeric;
    v_price_eur := (v_update ->> 'price_eur')::numeric;

    if v_price_base_usd is not null and (v_price_base_usd < 0 or v_price_base_usd > 10000000)
      or v_price_base_eur is not null and (v_price_base_eur < 0 or v_price_base_eur > 10000000)
      or v_price_usd is not null and (v_price_usd < 0 or v_price_usd > 10000000)
      or v_price_eur is not null and (v_price_eur < 0 or v_price_eur > 10000000) then
      raise exception 'Los precios deben estar entre 0 y 10.000.000' using errcode = '22023';
    end if;

    v_source_url_usd := nullif(trim(v_update ->> 'price_source_url_usd'), '');
    v_source_url_eur := nullif(trim(v_update ->> 'price_source_url_eur'), '');
    if v_source_url_usd is not null and (length(v_source_url_usd) > 2048 or v_source_url_usd !~* '^https?://[^[:space:]]+$')
      or v_source_url_eur is not null and (length(v_source_url_eur) > 2048 or v_source_url_eur !~* '^https?://[^[:space:]]+$') then
      raise exception 'La fuente debe ser una URL http o https válida' using errcode = '22023';
    end if;

    v_checked_at_usd := nullif(v_update ->> 'price_checked_at_usd', '')::date;
    v_checked_at_eur := nullif(v_update ->> 'price_checked_at_eur', '')::date;

    update public.products
    set price_base_usd = round(v_price_base_usd, 2),
        price_base_eur = round(v_price_base_eur, 2),
        price_usd = round(v_price_usd, 2),
        price_eur = round(v_price_eur, 2),
        price_source_url_usd = v_source_url_usd,
        price_source_url_eur = v_source_url_eur,
        price_checked_at_usd = v_checked_at_usd,
        price_checked_at_eur = v_checked_at_eur,
        prices_updated_at = now(),
        prices_updated_by = p_admin_user_id
    where id = v_id;

    if not found then
      raise exception 'No se encontró el producto solicitado' using errcode = 'P0002';
    end if;

    v_updated_ids := v_updated_ids || to_jsonb(v_id);
  end loop;

  return jsonb_build_object('updated', v_updated_ids, 'count', jsonb_array_length(v_updated_ids));
end;
$function$;

revoke all on function public.update_catalog_product_prices(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.update_catalog_product_prices(uuid, jsonb) to service_role;

commit;
