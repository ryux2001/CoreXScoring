begin;

alter table public.ai_provider_budget_config
  alter column openrouter_daily_limit_microusd set default 200000,
  alter column openrouter_monthly_limit_microusd set default 2000000;

update public.ai_provider_budget_config
set openrouter_daily_limit_microusd = 200000,
    openrouter_monthly_limit_microusd = 2000000,
    updated_at = now()
where singleton is true;

alter table public.ai_provider_budget_models
  add column if not exists cached_input_microusd_per_million bigint not null default 30000 check (cached_input_microusd_per_million >= 0),
  add column if not exists cache_write_microusd_per_million bigint not null default 30000 check (cache_write_microusd_per_million >= 0);

insert into public.ai_provider_budget_models (
  provider,
  model,
  input_microusd_per_million,
  output_microusd_per_million,
  cached_input_microusd_per_million,
  cache_write_microusd_per_million
) values (
  'openrouter',
  'qwen/qwen3.7-flash',
  30000,
  130000,
  6000,
  38000
)
on conflict (provider, model) do update set
  input_microusd_per_million = excluded.input_microusd_per_million,
  output_microusd_per_million = excluded.output_microusd_per_million,
  cached_input_microusd_per_million = excluded.cached_input_microusd_per_million,
  cache_write_microusd_per_million = excluded.cache_write_microusd_per_million;

-- El router gratuito se reserva al precio de Qwen para que un fallback de pago
-- nunca pueda rebasar el límite antes de conocer el modelo efectivo.
insert into public.ai_provider_budget_models (
  provider,
  model,
  input_microusd_per_million,
  output_microusd_per_million,
  cached_input_microusd_per_million,
  cache_write_microusd_per_million
) values (
  'openrouter',
  'openrouter/free',
  30000,
  130000,
  6000,
  38000
)
on conflict (provider, model) do update set
  input_microusd_per_million = excluded.input_microusd_per_million,
  output_microusd_per_million = excluded.output_microusd_per_million,
  cached_input_microusd_per_million = excluded.cached_input_microusd_per_million,
  cache_write_microusd_per_million = excluded.cache_write_microusd_per_million;

create function public.settle_openrouter_budget(
  p_reservation_id uuid,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cached_input_tokens integer,
  p_cache_write_tokens integer,
  p_actual_model text
)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  r public.ai_provider_cost_reservations%rowtype;
  m public.ai_provider_budget_models%rowtype;
  actual bigint;
  delta bigint;
  uncached_input_tokens integer;
begin
  if p_reservation_id is null
    or p_input_tokens < 0
    or p_output_tokens < 0
    or p_cached_input_tokens < 0
    or p_cache_write_tokens < 0
    or p_actual_model is null
    or length(p_actual_model) = 0
    or length(p_actual_model) > 200
    or p_cached_input_tokens + p_cache_write_tokens > p_input_tokens then
    raise exception 'Invalid AI budget settlement' using errcode = '22023';
  end if;

  select * into r from public.ai_provider_cost_reservations where id = p_reservation_id for update;
  if not found or r.state <> 'pending' then raise exception 'AI budget reservation is finalized' using errcode = 'P0001'; end if;
  select * into m from public.ai_provider_budget_models where provider = r.provider and model = p_actual_model;
  if not found then
    if r.model = 'openrouter/free' and (p_actual_model = 'openrouter/free' or p_actual_model like '%:free') then
      actual := 0;
    else
      raise exception 'OpenRouter actual model is not budgeted' using errcode = '22023';
    end if;
  else
    uncached_input_tokens := p_input_tokens - p_cached_input_tokens - p_cache_write_tokens;
    actual := ceil(uncached_input_tokens::numeric * m.input_microusd_per_million / 1000000)
      + ceil(p_cached_input_tokens::numeric * m.cached_input_microusd_per_million / 1000000)
      + ceil(p_cache_write_tokens::numeric * m.cache_write_microusd_per_million / 1000000)
      + ceil(p_output_tokens::numeric * m.output_microusd_per_million / 1000000);
  end if;
  delta := actual - r.reserved_microusd;
  update public.ai_provider_budget_usage
  set reserved_microusd = greatest(0, reserved_microusd + delta)
  where provider = 'openrouter'
    and ((period_kind = 'day' and period_start = r.usage_date) or (period_kind = 'month' and period_start = r.usage_month));
  update public.ai_provider_cost_reservations
  set state = 'settled', actual_microusd = actual, settled_at = now()
  where id = r.id;
end;
$$;

revoke all on function public.settle_openrouter_budget(uuid, integer, integer, integer, integer, text) from public, anon, authenticated;
grant execute on function public.settle_openrouter_budget(uuid, integer, integer, integer, integer, text) to service_role;

commit;
