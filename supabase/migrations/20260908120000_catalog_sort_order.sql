-- Orden administrativo global para builds y combos del catálogo público.

alter table public.builds
  add column if not exists sort_order integer;

alter table public.combos
  add column if not exists sort_order integer;

with ordered_builds as (
  select id, row_number() over (order by created_at desc, id asc) as next_order
  from public.builds
)
update public.builds as item
set sort_order = ordered_builds.next_order
from ordered_builds
where item.id = ordered_builds.id
  and item.sort_order is null;

with ordered_combos as (
  select id, row_number() over (order by created_at desc, id asc) as next_order
  from public.combos
)
update public.combos as item
set sort_order = ordered_combos.next_order
from ordered_combos
where item.id = ordered_combos.id
  and item.sort_order is null;

alter table public.builds
  alter column sort_order set default 0,
  alter column sort_order set not null;

alter table public.combos
  alter column sort_order set default 0,
  alter column sort_order set not null;

create index if not exists builds_catalog_order_idx
  on public.builds (is_active, sort_order, created_at desc);

create index if not exists combos_catalog_order_idx
  on public.combos (is_active, sort_order, created_at desc);

create or replace function public.reorder_catalog_items(
  p_kind text,
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

  if p_kind not in ('builds', 'combos') then
    raise exception 'Invalid catalog kind' using errcode = '22023';
  end if;

  v_table := p_kind;

  select count(distinct item_id)::integer
  into v_distinct_count
  from unnest(coalesce(p_ids, '{}'::uuid[])) as requested(item_id);

  execute format('select count(*)::integer from public.%I', v_table)
  into v_existing_count;

  execute format('select count(*)::integer from public.%I where id = any($1)', v_table)
  into v_matching_count
  using coalesce(p_ids, '{}'::uuid[]);

  if v_requested_count <> v_existing_count
     or v_distinct_count <> v_requested_count
     or v_matching_count <> v_requested_count then
    raise exception 'The submitted catalog order is incomplete or contains invalid IDs'
      using errcode = '22023';
  end if;

  if v_requested_count > 0 then
    for v_position in 1..v_requested_count loop
      execute format('update public.%I set sort_order = $1 where id = $2', v_table)
      using v_position, p_ids[v_position];
    end loop;
  end if;
end;
$$;

revoke all on function public.reorder_catalog_items(text, uuid[]) from public, anon;
grant execute on function public.reorder_catalog_items(text, uuid[]) to authenticated;
