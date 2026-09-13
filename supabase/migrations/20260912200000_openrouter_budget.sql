begin;

create table public.ai_provider_budget_config (
  singleton boolean primary key default true check (singleton is true),
  openrouter_daily_limit_microusd bigint not null default 500000 check (openrouter_daily_limit_microusd > 0),
  openrouter_monthly_limit_microusd bigint not null default 5000000 check (openrouter_monthly_limit_microusd > 0),
  updated_at timestamptz not null default now()
);

insert into public.ai_provider_budget_config (singleton) values (true) on conflict do nothing;

create table public.ai_provider_budget_models (
  provider text not null check (provider = 'openrouter'),
  model text not null,
  input_microusd_per_million bigint not null check (input_microusd_per_million >= 0),
  output_microusd_per_million bigint not null check (output_microusd_per_million >= 0),
  primary key (provider, model)
);

insert into public.ai_provider_budget_models (provider, model, input_microusd_per_million, output_microusd_per_million)
values ('openrouter', 'openai/gpt-oss-20b', 30000, 130000)
on conflict (provider, model) do nothing;

create table public.ai_provider_budget_usage (
  provider text not null check (provider = 'openrouter'),
  period_kind text not null check (period_kind in ('day', 'month')),
  period_start date not null,
  reserved_microusd bigint not null default 0 check (reserved_microusd >= 0),
  primary key (provider, period_kind, period_start)
);

create table public.ai_provider_cost_reservations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  provider text not null check (provider = 'openrouter'),
  model text not null,
  usage_date date not null,
  usage_month date not null,
  reserved_microusd bigint not null check (reserved_microusd >= 0),
  actual_microusd bigint,
  state text not null default 'pending' check (state in ('pending', 'settled', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  settled_at timestamptz,
  check ((state = 'pending' and actual_microusd is null and settled_at is null) or (state = 'settled' and actual_microusd is not null and settled_at is not null) or (state = 'expired' and actual_microusd is null and settled_at is null))
);

create table public.ai_provider_budget_alerts (
  provider text not null check (provider = 'openrouter'),
  period_kind text not null check (period_kind in ('day', 'month')),
  period_start date not null,
  threshold_percent smallint not null check (threshold_percent in (70, 90)),
  created_at timestamptz not null default now(),
  emailed_at timestamptz,
  primary key (provider, period_kind, period_start, threshold_percent)
);

alter table public.ai_provider_budget_config enable row level security;
alter table public.ai_provider_budget_models enable row level security;
alter table public.ai_provider_budget_usage enable row level security;
alter table public.ai_provider_cost_reservations enable row level security;
alter table public.ai_provider_budget_alerts enable row level security;
revoke all on public.ai_provider_budget_config, public.ai_provider_budget_models, public.ai_provider_budget_usage, public.ai_provider_cost_reservations, public.ai_provider_budget_alerts from anon, authenticated;
grant all on public.ai_provider_budget_config, public.ai_provider_budget_models, public.ai_provider_budget_usage, public.ai_provider_cost_reservations, public.ai_provider_budget_alerts to service_role;

create or replace function public.reserve_openrouter_budget(p_request_id uuid, p_model text, p_input_tokens integer, p_output_tokens integer)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare c public.ai_provider_budget_config%rowtype; m public.ai_provider_budget_models%rowtype; d date := timezone('utc', now())::date; mo date := date_trunc('month', timezone('utc', now()))::date; cost bigint; day_used bigint; month_used bigint; id uuid;
begin
  if p_request_id is null or p_input_tokens < 0 or p_output_tokens < 0 then raise exception 'Invalid AI budget reservation' using errcode = '22023'; end if;
  select * into c from public.ai_provider_budget_config where singleton is true;
  select * into m from public.ai_provider_budget_models where provider = 'openrouter' and model = p_model;
  if not found then raise exception 'OpenRouter model is not budgeted' using errcode = '22023'; end if;
  cost := ceil(p_input_tokens::numeric * m.input_microusd_per_million / 1000000) + ceil(p_output_tokens::numeric * m.output_microusd_per_million / 1000000);
  insert into public.ai_provider_budget_usage(provider, period_kind, period_start) values ('openrouter','day',d),('openrouter','month',mo) on conflict do nothing;
  select reserved_microusd into day_used from public.ai_provider_budget_usage where provider='openrouter' and period_kind='day' and period_start=d for update;
  select reserved_microusd into month_used from public.ai_provider_budget_usage where provider='openrouter' and period_kind='month' and period_start=mo for update;
  if day_used + cost > c.openrouter_daily_limit_microusd or month_used + cost > c.openrouter_monthly_limit_microusd then return jsonb_build_object('allowed',false); end if;
  insert into public.ai_provider_cost_reservations(request_id,provider,model,usage_date,usage_month,reserved_microusd) values (p_request_id,'openrouter',p_model,d,mo,cost) returning id into id;
  update public.ai_provider_budget_usage set reserved_microusd = reserved_microusd + cost where provider='openrouter' and ((period_kind='day' and period_start=d) or (period_kind='month' and period_start=mo));
  return jsonb_build_object('allowed',true,'reservation_id',id,'reserved_microusd',cost);
end; $$;

create or replace function public.settle_openrouter_budget(p_reservation_id uuid, p_input_tokens integer, p_output_tokens integer)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare r public.ai_provider_cost_reservations%rowtype; m public.ai_provider_budget_models%rowtype; actual bigint; delta bigint;
begin
  if p_reservation_id is null or p_input_tokens < 0 or p_output_tokens < 0 then raise exception 'Invalid AI budget settlement' using errcode = '22023'; end if;
  select * into r from public.ai_provider_cost_reservations where id=p_reservation_id for update;
  if not found or r.state <> 'pending' then raise exception 'AI budget reservation is finalized' using errcode = 'P0001'; end if;
  select * into m from public.ai_provider_budget_models where provider=r.provider and model=r.model;
  actual := ceil(p_input_tokens::numeric * m.input_microusd_per_million / 1000000) + ceil(p_output_tokens::numeric * m.output_microusd_per_million / 1000000);
  delta := actual-r.reserved_microusd;
  update public.ai_provider_budget_usage set reserved_microusd=greatest(0,reserved_microusd+delta) where provider='openrouter' and ((period_kind='day' and period_start=r.usage_date) or (period_kind='month' and period_start=r.usage_month));
  update public.ai_provider_cost_reservations set state='settled',actual_microusd=actual,settled_at=now() where id=r.id;
end; $$;

revoke all on function public.reserve_openrouter_budget(uuid,text,integer,integer) from public,anon,authenticated;
revoke all on function public.settle_openrouter_budget(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_openrouter_budget(uuid,text,integer,integer) to service_role;
grant execute on function public.settle_openrouter_budget(uuid,integer,integer) to service_role;
commit;
