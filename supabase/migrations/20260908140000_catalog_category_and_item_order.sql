-- Separa el orden de las categorías del orden de las tarjetas dentro de cada categoría.
-- Reutiliza builds.sort_order y combos.sort_order como orden interno de tarjetas.

create table if not exists public.catalog_category_orders (
  catalog_kind text not null check (catalog_kind in ('builds', 'combos')),
  category text not null check (length(trim(category)) > 0),
  sort_order integer not null,
  primary key (catalog_kind, category),
  unique (catalog_kind, sort_order)
);

insert into public.catalog_category_orders (catalog_kind, category, sort_order)
select 'builds', category_name, row_number() over (order by first_item_order, category_name)::integer
from (
  select coalesce(nullif(trim(category), ''), 'Sin categoría') as category_name,
         min(sort_order) as first_item_order
  from public.builds
  group by coalesce(nullif(trim(category), ''), 'Sin categoría')
) as build_categories
on conflict (catalog_kind, category) do nothing;

insert into public.catalog_category_orders (catalog_kind, category, sort_order)
select 'combos', category_name, row_number() over (order by first_item_order, category_name)::integer
from (
  select coalesce(nullif(trim(category), ''), 'Sin categoría') as category_name,
         min(sort_order) as first_item_order
  from public.combos
  group by coalesce(nullif(trim(category), ''), 'Sin categoría')
) as combo_categories
on conflict (catalog_kind, category) do nothing;

with ranked_builds as (
  select id,
         row_number() over (
           partition by coalesce(nullif(trim(category), ''), 'Sin categoría')
           order by sort_order asc, created_at desc, id asc
         )::integer as next_order
  from public.builds
)
update public.builds as item
set sort_order = ranked_builds.next_order
from ranked_builds
where item.id = ranked_builds.id;

with ranked_combos as (
  select id,
         row_number() over (
           partition by coalesce(nullif(trim(category), ''), 'Sin categoría')
           order by sort_order asc, created_at desc, id asc
         )::integer as next_order
  from public.combos
)
update public.combos as item
set sort_order = ranked_combos.next_order
from ranked_combos
where item.id = ranked_combos.id;

alter table public.catalog_category_orders enable row level security;

drop policy if exists "Anyone can read catalog category order" on public.catalog_category_orders;
create policy "Anyone can read catalog category order"
  on public.catalog_category_orders
  for select
  to anon, authenticated
  using (true);

grant select on table public.catalog_category_orders to anon, authenticated;

create or replace function public.reorder_catalog_categories(
  p_kind text,
  p_categories text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_count integer := coalesce(array_length(p_categories, 1), 0);
  v_distinct_count integer;
  v_existing_count integer;
  v_matching_count integer;
  v_position integer;
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Catalog admin access denied' using errcode = '42501';
  end if;

  if p_kind not in ('builds', 'combos') then
    raise exception 'Invalid catalog kind' using errcode = '22023';
  end if;

  select count(distinct category_name)::integer
  into v_distinct_count
  from unnest(coalesce(p_categories, '{}'::text[])) as requested(category_name);

  select count(*)::integer
  into v_existing_count
  from public.catalog_category_orders
  where catalog_kind = p_kind;

  select count(*)::integer
  into v_matching_count
  from public.catalog_category_orders
  where catalog_kind = p_kind
    and category = any(coalesce(p_categories, '{}'::text[]));

  if v_requested_count <> v_existing_count
     or v_distinct_count <> v_requested_count
     or v_matching_count <> v_requested_count then
    raise exception 'The submitted category order is incomplete or invalid'
      using errcode = '22023';
  end if;

  update public.catalog_category_orders
  set sort_order = sort_order + 1000000
  where catalog_kind = p_kind;

  if v_requested_count > 0 then
    for v_position in 1..v_requested_count loop
      update public.catalog_category_orders
      set sort_order = v_position
      where catalog_kind = p_kind
        and category = p_categories[v_position];
    end loop;
  end if;
end;
$$;

create or replace function public.reorder_catalog_items_by_category(
  p_kind text,
  p_category text,
  p_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table text;
  v_requested_count integer := coalesce(array_length(p_ids, 1), 0);
  v_distinct_count integer;
  v_existing_count integer;
  v_matching_count integer;
  v_position integer;
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Catalog admin access denied' using errcode = '42501';
  end if;

  if p_kind not in ('builds', 'combos') or p_category is null or trim(p_category) = '' then
    raise exception 'Invalid catalog category' using errcode = '22023';
  end if;

  v_table := p_kind;

  select count(distinct item_id)::integer
  into v_distinct_count
  from unnest(coalesce(p_ids, '{}'::uuid[])) as requested(item_id);

  execute format(
    'select count(*)::integer from public.%I where coalesce(nullif(trim(category), ''''), ''Sin categoría'') = $1',
    v_table
  ) into v_existing_count using p_category;

  execute format(
    'select count(*)::integer from public.%I where coalesce(nullif(trim(category), ''''), ''Sin categoría'') = $1 and id = any($2)',
    v_table
  ) into v_matching_count using p_category, coalesce(p_ids, '{}'::uuid[]);

  if v_requested_count <> v_existing_count
     or v_distinct_count <> v_requested_count
     or v_matching_count <> v_requested_count then
    raise exception 'The submitted item order is incomplete or invalid'
      using errcode = '22023';
  end if;

  execute format(
    'update public.%I set sort_order = sort_order + 1000000 where coalesce(nullif(trim(category), ''''), ''Sin categoría'') = $1',
    v_table
  ) using p_category;

  if v_requested_count > 0 then
    for v_position in 1..v_requested_count loop
      execute format('update public.%I set sort_order = $1 where id = $2', v_table)
      using v_position, p_ids[v_position];
    end loop;
  end if;
end;
$$;

revoke all on function public.reorder_catalog_categories(text, text[]) from public, anon;
grant execute on function public.reorder_catalog_categories(text, text[]) to authenticated;

revoke all on function public.reorder_catalog_items_by_category(text, text, uuid[]) from public, anon;
grant execute on function public.reorder_catalog_items_by_category(text, text, uuid[]) to authenticated;
