-- Keep user-created vault entries private, well-formed, and internally consistent.
begin;

-- Existing user builds were never public catalog entries. Normalize them before
-- constraining the fields so their visibility cannot be client-controlled.
update public.created_builds
set category = 'Personalizada',
    is_active = false
where category is distinct from 'Personalizada'
   or is_active is distinct from false;

alter table public.created_builds
  alter column category set default 'Personalizada',
  alter column is_active set default false;

alter table public.created_combos
  add constraint created_combos_title_check
    check (char_length(trim(title)) between 1 and 120),
  add constraint created_combos_slug_check
    check (char_length(trim(slug)) between 1 and 160),
  add constraint created_combos_custom_prices_check
    check (
      (custom_price_cpu_usd is null or (custom_price_cpu_usd > 0 and custom_price_cpu_usd < 'Infinity'::numeric))
      and (custom_price_cpu_eur is null or (custom_price_cpu_eur > 0 and custom_price_cpu_eur < 'Infinity'::numeric))
      and (custom_price_gpu_usd is null or (custom_price_gpu_usd > 0 and custom_price_gpu_usd < 'Infinity'::numeric))
      and (custom_price_gpu_eur is null or (custom_price_gpu_eur > 0 and custom_price_gpu_eur < 'Infinity'::numeric))
      and (custom_price_ram_usd is null or (custom_price_ram_usd > 0 and custom_price_ram_usd < 'Infinity'::numeric))
      and (custom_price_ram_eur is null or (custom_price_ram_eur > 0 and custom_price_ram_eur < 'Infinity'::numeric))
    );

alter table public.created_builds
  add constraint created_builds_title_check
    check (char_length(trim(title)) between 1 and 120),
  add constraint created_builds_slug_check
    check (char_length(trim(slug)) between 1 and 160),
  add constraint created_builds_category_check
    check (category = 'Personalizada'),
  add constraint created_builds_private_check
    check (is_active = false),
  add constraint created_builds_custom_prices_check
    check (
      (custom_price_cpu_usd is null or (custom_price_cpu_usd > 0 and custom_price_cpu_usd < 'Infinity'::numeric))
      and (custom_price_cpu_eur is null or (custom_price_cpu_eur > 0 and custom_price_cpu_eur < 'Infinity'::numeric))
      and (custom_price_gpu_usd is null or (custom_price_gpu_usd > 0 and custom_price_gpu_usd < 'Infinity'::numeric))
      and (custom_price_gpu_eur is null or (custom_price_gpu_eur > 0 and custom_price_gpu_eur < 'Infinity'::numeric))
      and (custom_price_ram_usd is null or (custom_price_ram_usd > 0 and custom_price_ram_usd < 'Infinity'::numeric))
      and (custom_price_ram_eur is null or (custom_price_ram_eur > 0 and custom_price_ram_eur < 'Infinity'::numeric))
      and (custom_price_motherboard_usd is null or (custom_price_motherboard_usd > 0 and custom_price_motherboard_usd < 'Infinity'::numeric))
      and (custom_price_motherboard_eur is null or (custom_price_motherboard_eur > 0 and custom_price_motherboard_eur < 'Infinity'::numeric))
      and (custom_price_storage_usd is null or (custom_price_storage_usd > 0 and custom_price_storage_usd < 'Infinity'::numeric))
      and (custom_price_storage_eur is null or (custom_price_storage_eur > 0 and custom_price_storage_eur < 'Infinity'::numeric))
      and (custom_price_psu_usd is null or (custom_price_psu_usd > 0 and custom_price_psu_usd < 'Infinity'::numeric))
      and (custom_price_psu_eur is null or (custom_price_psu_eur > 0 and custom_price_psu_eur < 'Infinity'::numeric))
    );

create or replace function public.validate_created_vault_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE'
    and (new.user_id is distinct from old.user_id or new.created_at is distinct from old.created_at) then
    raise exception 'Created vault ownership and creation time are immutable' using errcode = '22023';
  end if;

  if tg_table_name = 'created_combos' then
    if (select type from public.products where id = new.cpu_id) is distinct from 'cpu'
      or (select type from public.products where id = new.gpu_id) is distinct from 'gpu'
      or (select type from public.products where id = new.ram_id) is distinct from 'ram' then
      raise exception 'Created combo components must match their slots' using errcode = '22023';
    end if;
  elsif tg_table_name = 'created_builds' then
    if (select type from public.products where id = new.cpu_id) is distinct from 'cpu'
      or (select type from public.products where id = new.gpu_id) is distinct from 'gpu'
      or (select type from public.products where id = new.ram_id) is distinct from 'ram'
      or (select type from public.products where id = new.motherboard_id) is distinct from 'motherboard'
      or (select type from public.products where id = new.storage_id) is distinct from 'storage'
      or (select type from public.products where id = new.psu_id) is distinct from 'psu' then
      raise exception 'Created build components must match their slots' using errcode = '22023';
    end if;
  else
    raise exception 'Unsupported created vault table' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_created_vault_entry() from public;

create trigger validate_created_combos_entry
  before insert or update on public.created_combos
  for each row execute function public.validate_created_vault_entry();

create trigger validate_created_builds_entry
  before insert or update on public.created_builds
  for each row execute function public.validate_created_vault_entry();

commit;
