begin;

create table public.ai_abuse_config (
  singleton boolean primary key default true check (singleton is true),
  global_concurrency_limit integer not null default 10 check (global_concurrency_limit > 0),
  user_concurrency_limit integer not null default 2 check (user_concurrency_limit > 0),
  anonymous_ip_concurrency_limit integer not null default 1 check (anonymous_ip_concurrency_limit > 0),
  active_pending_actions_limit integer not null default 5 check (active_pending_actions_limit > 0),
  anonymous_session_ttl_hours integer not null default 24 check (anonymous_session_ttl_hours between 1 and 168),
  circuit_failure_threshold integer not null default 5 check (circuit_failure_threshold > 0),
  circuit_timeout_threshold integer not null default 3 check (circuit_timeout_threshold > 0),
  circuit_window_seconds integer not null default 300 check (circuit_window_seconds between 60 and 3600),
  circuit_cooldown_seconds integer not null default 300 check (circuit_cooldown_seconds between 60 and 3600),
  updated_at timestamptz not null default now()
);

insert into public.ai_abuse_config (singleton) values (true) on conflict do nothing;

create table public.ai_request_leases (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_hash text,
  is_anonymous boolean not null,
  scope text not null default 'ai',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  released_at timestamptz,
  check (length(scope) between 1 and 40),
  check (expires_at > created_at)
);

create index ai_request_leases_active_idx
  on public.ai_request_leases (expires_at)
  where released_at is null;
create index ai_request_leases_user_active_idx
  on public.ai_request_leases (user_id, expires_at)
  where released_at is null;
create index ai_request_leases_ip_active_idx
  on public.ai_request_leases (ip_hash, expires_at)
  where released_at is null and ip_hash is not null;

create table public.ai_provider_circuit_state (
  provider text not null,
  model text not null,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  timeout_failures integer not null default 0 check (timeout_failures >= 0),
  window_started_at timestamptz,
  open_until timestamptz,
  probe_in_flight boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (provider, model)
);

alter table public.ai_abuse_config enable row level security;
alter table public.ai_request_leases enable row level security;
alter table public.ai_provider_circuit_state enable row level security;
revoke all on public.ai_abuse_config, public.ai_request_leases, public.ai_provider_circuit_state from public, anon, authenticated;
grant all on public.ai_abuse_config, public.ai_request_leases, public.ai_provider_circuit_state to service_role;

create or replace function public.acquire_ai_request_lease(
  p_request_id uuid,
  p_user_id uuid,
  p_ip_hash text,
  p_is_anonymous boolean,
  p_scope text default 'ai'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_config public.ai_abuse_config%rowtype;
  v_lease_id uuid;
  v_global_count integer;
  v_user_count integer;
  v_ip_count integer;
  v_expires_at timestamptz := now() + interval '2 minutes';
begin
  if p_request_id is null or p_user_id is null or p_scope is null or length(p_scope) not between 1 and 40 then
    raise exception 'AI request lease is invalid' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ai-request-leases:' || p_scope, 4811));
  update public.ai_request_leases
  set released_at = coalesce(released_at, now())
  where released_at is null and expires_at <= now();

  select * into v_config from public.ai_abuse_config where singleton is true;
  if not found then raise exception 'AI abuse configuration is missing' using errcode = 'P0001'; end if;

  select count(*) into v_global_count
  from public.ai_request_leases
  where scope = p_scope and released_at is null and expires_at > now();
  if v_global_count >= v_config.global_concurrency_limit then
    return jsonb_build_object('allowed', false, 'reason', 'global_concurrency', 'retry_after_seconds', 5);
  end if;

  select count(*) into v_user_count
  from public.ai_request_leases
  where scope = p_scope and user_id = p_user_id and released_at is null and expires_at > now();
  if v_user_count >= v_config.user_concurrency_limit then
    return jsonb_build_object('allowed', false, 'reason', 'user_concurrency', 'retry_after_seconds', 5);
  end if;

  if p_is_anonymous and p_ip_hash is not null then
    select count(*) into v_ip_count
    from public.ai_request_leases
    where scope = p_scope and ip_hash = p_ip_hash and released_at is null and expires_at > now();
    if v_ip_count >= v_config.anonymous_ip_concurrency_limit then
      return jsonb_build_object('allowed', false, 'reason', 'ip_concurrency', 'retry_after_seconds', 5);
    end if;
  end if;

  insert into public.ai_request_leases (request_id, user_id, ip_hash, is_anonymous, scope, expires_at)
  values (p_request_id, p_user_id, p_ip_hash, p_is_anonymous, p_scope, v_expires_at)
  returning id into v_lease_id;

  return jsonb_build_object('allowed', true, 'lease_id', v_lease_id, 'expires_at', v_expires_at);
exception
  when unique_violation then
    select id into v_lease_id from public.ai_request_leases where request_id = p_request_id;
    return jsonb_build_object('allowed', true, 'lease_id', v_lease_id);
end;
$$;

create or replace function public.release_ai_request_lease(p_lease_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_lease_id is null then return; end if;
  update public.ai_request_leases
  set released_at = coalesce(released_at, now())
  where id = p_lease_id and released_at is null;
end;
$$;

create or replace function public.check_ai_provider_circuit(p_provider text, p_model text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state public.ai_provider_circuit_state%rowtype;
begin
  if p_provider is null or p_model is null or length(p_provider) > 30 or length(p_model) > 160 then
    raise exception 'AI provider circuit key is invalid' using errcode = '22023';
  end if;

  insert into public.ai_provider_circuit_state (provider, model)
  values (p_provider, p_model)
  on conflict (provider, model) do nothing;
  select * into v_state from public.ai_provider_circuit_state
  where provider = p_provider and model = p_model for update;

  if v_state.open_until is not null and v_state.open_until > now() then
    return jsonb_build_object('allowed', false, 'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_state.open_until - now())))::integer));
  end if;

  if v_state.open_until is not null and v_state.probe_in_flight then
    return jsonb_build_object('allowed', false, 'retry_after_seconds', 5);
  end if;

  if v_state.open_until is not null then
    update public.ai_provider_circuit_state
    set probe_in_flight = true, updated_at = now()
    where provider = p_provider and model = p_model;
    return jsonb_build_object('allowed', true, 'probe', true);
  end if;

  return jsonb_build_object('allowed', true, 'probe', false);
end;
$$;

create or replace function public.record_ai_provider_success(p_provider text, p_model text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.ai_provider_circuit_state
  set consecutive_failures = 0,
      timeout_failures = 0,
      window_started_at = null,
      open_until = null,
      probe_in_flight = false,
      updated_at = now()
  where provider = p_provider and model = p_model;
end;
$$;

create or replace function public.record_ai_provider_failure(p_provider text, p_model text, p_is_timeout boolean)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_config public.ai_abuse_config%rowtype;
  v_state public.ai_provider_circuit_state%rowtype;
  v_consecutive integer;
  v_timeouts integer;
  v_window timestamptz;
  v_open_until timestamptz;
begin
  select * into v_config from public.ai_abuse_config where singleton is true;
  insert into public.ai_provider_circuit_state (provider, model)
  values (p_provider, p_model)
  on conflict (provider, model) do nothing;
  select * into v_state from public.ai_provider_circuit_state
  where provider = p_provider and model = p_model for update;

  if v_state.window_started_at is null or v_state.window_started_at < now() - make_interval(secs => v_config.circuit_window_seconds) then
    v_consecutive := 0;
    v_timeouts := 0;
    v_window := now();
  else
    v_consecutive := v_state.consecutive_failures;
    v_timeouts := v_state.timeout_failures;
    v_window := v_state.window_started_at;
  end if;
  v_consecutive := v_consecutive + 1;
  v_timeouts := v_timeouts + case when p_is_timeout then 1 else 0 end;
  v_open_until := case when v_consecutive >= v_config.circuit_failure_threshold or v_timeouts >= v_config.circuit_timeout_threshold
    then now() + make_interval(secs => v_config.circuit_cooldown_seconds) else null end;

  update public.ai_provider_circuit_state
  set consecutive_failures = v_consecutive,
      timeout_failures = v_timeouts,
      window_started_at = v_window,
      open_until = v_open_until,
      probe_in_flight = false,
      updated_at = now()
  where provider = p_provider and model = p_model;
  return jsonb_build_object('open', v_open_until is not null, 'open_until', v_open_until);
end;
$$;

create or replace function public.cleanup_ai_abuse_state()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_leases integer;
  v_circuits integer;
  v_actions integer;
begin
  delete from public.ai_request_leases where released_at is not null or expires_at < now() - interval '1 day';
  get diagnostics v_leases = row_count;
  delete from public.ai_provider_circuit_state where updated_at < now() - interval '2 days' and open_until is null;
  get diagnostics v_circuits = row_count;
  delete from public.ai_pending_actions where expires_at < now() and consumed_at is null;
  get diagnostics v_actions = row_count;
  return jsonb_build_object('leases', v_leases, 'circuits', v_circuits, 'actions', v_actions);
end;
$$;

-- Pending-action creation is backend-only and capped atomically per account.
create or replace function public.create_ai_pending_action_server (
  p_user_id        uuid,
  p_action_type    text,
  p_payload        jsonb,
  p_payload_digest text,
  p_expires_at     timestamp with time zone
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_limit integer;
begin
  if p_user_id is null then
    raise exception 'AI pending action user is required' using errcode = '22023';
  end if;
  if p_action_type not in ('create_combo', 'create_build', 'set_custom_price')
    or p_payload is null
    or p_payload_digest !~ '^[a-f0-9]{64}$'
    or p_expires_at <= now()
    or p_expires_at > now() + interval '15 minutes' then
    raise exception 'AI pending action is invalid' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 7719));
  select active_pending_actions_limit into v_limit from public.ai_abuse_config where singleton is true;
  if (select count(*) from public.ai_pending_actions
      where user_id = p_user_id
        and consumed_at is null
        and expires_at > now()
        and status in ('pending', 'failed', 'executing')) >= coalesce(v_limit, 5) then
    raise exception 'AI pending action limit reached' using errcode = 'P0001';
  end if;

  insert into public.ai_pending_actions (user_id, action_type, payload, payload_digest, expires_at)
  values (p_user_id, p_action_type, p_payload, lower(p_payload_digest), p_expires_at)
  returning id into v_id;
  return v_id;
end;
$function$;

revoke all on function public.acquire_ai_request_lease(uuid, uuid, text, boolean, text) from public, anon, authenticated;
revoke all on function public.release_ai_request_lease(uuid) from public, anon, authenticated;
revoke all on function public.check_ai_provider_circuit(text, text) from public, anon, authenticated;
revoke all on function public.record_ai_provider_success(text, text) from public, anon, authenticated;
revoke all on function public.record_ai_provider_failure(text, text, boolean) from public, anon, authenticated;
revoke all on function public.cleanup_ai_abuse_state() from public, anon, authenticated;
revoke all on function public.create_ai_pending_action(text, jsonb, text, timestamp with time zone) from public, anon, authenticated;
revoke all on function public.create_ai_pending_action_server(uuid, text, jsonb, text, timestamp with time zone) from public, anon, authenticated;
grant execute on function public.acquire_ai_request_lease(uuid, uuid, text, boolean, text) to service_role;
grant execute on function public.release_ai_request_lease(uuid) to service_role;
grant execute on function public.check_ai_provider_circuit(text, text) to service_role;
grant execute on function public.record_ai_provider_success(text, text) to service_role;
grant execute on function public.record_ai_provider_failure(text, text, boolean) to service_role;
grant execute on function public.cleanup_ai_abuse_state() to service_role;
grant execute on function public.create_ai_pending_action_server(uuid, text, jsonb, text, timestamp with time zone) to service_role;

do $schedule$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'corex-ai-abuse-cleanup';

  perform cron.schedule(
    'corex-ai-abuse-cleanup',
    '*/15 * * * *',
    'select public.cleanup_ai_abuse_state();'
  );
exception
  when undefined_table or undefined_function then
    -- Hosted Supabase has pg_cron; local environments without it still keep the RPC available.
    null;
end;
$schedule$;

commit;
