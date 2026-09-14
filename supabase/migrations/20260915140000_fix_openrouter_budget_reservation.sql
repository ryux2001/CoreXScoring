begin;

create or replace function public.reserve_openrouter_budget(
  p_request_id uuid,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  c public.ai_provider_budget_config%rowtype;
  m public.ai_provider_budget_models%rowtype;
  d date := timezone('utc', now())::date;
  mo date := date_trunc('month', timezone('utc', now()))::date;
  cost bigint;
  day_used bigint;
  month_used bigint;
  reservation_id uuid;
begin
  if p_request_id is null or p_input_tokens < 0 or p_output_tokens < 0 then
    raise exception 'Invalid AI budget reservation' using errcode = '22023';
  end if;

  select * into c from public.ai_provider_budget_config where singleton is true;
  select * into m from public.ai_provider_budget_models where provider = 'openrouter' and model = p_model;
  if not found then raise exception 'OpenRouter model is not budgeted' using errcode = '22023'; end if;

  cost := ceil(p_input_tokens::numeric * m.input_microusd_per_million / 1000000)
    + ceil(p_output_tokens::numeric * m.output_microusd_per_million / 1000000);
  insert into public.ai_provider_budget_usage(provider, period_kind, period_start)
  values ('openrouter', 'day', d), ('openrouter', 'month', mo)
  on conflict do nothing;
  select reserved_microusd into day_used
  from public.ai_provider_budget_usage
  where provider = 'openrouter' and period_kind = 'day' and period_start = d
  for update;
  select reserved_microusd into month_used
  from public.ai_provider_budget_usage
  where provider = 'openrouter' and period_kind = 'month' and period_start = mo
  for update;
  if day_used + cost > c.openrouter_daily_limit_microusd
    or month_used + cost > c.openrouter_monthly_limit_microusd then
    return jsonb_build_object('allowed', false);
  end if;

  insert into public.ai_provider_cost_reservations(
    request_id,
    provider,
    model,
    usage_date,
    usage_month,
    reserved_microusd
  ) values (
    p_request_id,
    'openrouter',
    p_model,
    d,
    mo,
    cost
  )
  returning ai_provider_cost_reservations.id into reservation_id;

  update public.ai_provider_budget_usage
  set reserved_microusd = reserved_microusd + cost
  where provider = 'openrouter'
    and ((period_kind = 'day' and period_start = d) or (period_kind = 'month' and period_start = mo));
  return jsonb_build_object('allowed', true, 'reservation_id', reservation_id, 'reserved_microusd', cost);
end;
$$;

revoke all on function public.reserve_openrouter_budget(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_openrouter_budget(uuid, text, integer, integer) to service_role;

commit;
