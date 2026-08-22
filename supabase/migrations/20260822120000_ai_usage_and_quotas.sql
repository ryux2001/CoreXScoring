-- CoreX AI Fase 4: cuotas atómicas, buckets por usuario/IP y telemetría mínima.
-- Aplicar esta migración en el proyecto Supabase antes de habilitar el chat en producción.

create table if not exists public.ai_quota_config (
  singleton boolean primary key default true check (singleton is true),
  anonymous_daily_messages integer not null default 20 check (anonymous_daily_messages > 0),
  authenticated_daily_messages integer not null default 200 check (authenticated_daily_messages > 0),
  anonymous_daily_tokens bigint not null default 30000 check (anonymous_daily_tokens > 0),
  authenticated_daily_tokens bigint not null default 200000 check (authenticated_daily_tokens > 0),
  anonymous_ip_daily_messages integer not null default 60 check (anonymous_ip_daily_messages > 0),
  authenticated_ip_daily_messages integer not null default 500 check (authenticated_ip_daily_messages > 0),
  anonymous_ip_daily_tokens bigint not null default 90000 check (anonymous_ip_daily_tokens > 0),
  authenticated_ip_daily_tokens bigint not null default 500000 check (authenticated_ip_daily_tokens > 0),
  updated_at timestamptz not null default now()
);

insert into public.ai_quota_config (singleton)
values (true)
on conflict (singleton) do nothing;

create table if not exists public.ai_usage_daily (
  usage_date date not null,
  bucket_scope text not null check (bucket_scope in ('user', 'ip')),
  bucket_key text not null,
  user_id uuid references auth.users(id) on delete cascade,
  ip_hash text,
  is_anonymous boolean not null,
  messages_used integer not null default 0 check (messages_used >= 0),
  reserved_tokens bigint not null default 0 check (reserved_tokens >= 0),
  last_used_at timestamptz not null default now(),
  primary key (usage_date, bucket_scope, bucket_key),
  check (
    (bucket_scope = 'user' and user_id is not null and ip_hash is null)
    or (bucket_scope = 'ip' and user_id is null and ip_hash is not null)
  )
);

create index if not exists ai_usage_daily_user_date_idx
  on public.ai_usage_daily (user_id, usage_date)
  where user_id is not null;

create table if not exists public.ai_action_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  is_anonymous boolean not null,
  ip_hash text,
  provider text not null check (provider in ('groq', 'openrouter', 'guardrail')),
  model text not null,
  duration_ms integer not null default 0 check (duration_ms >= 0),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  tool_calls integer not null default 0 check (tool_calls >= 0),
  status text not null check (status in ('success', 'error', 'guardrail', 'rate_limited')),
  error_code text
);

create index if not exists ai_action_logs_created_at_idx
  on public.ai_action_logs (created_at desc);

create index if not exists ai_action_logs_user_created_at_idx
  on public.ai_action_logs (user_id, created_at desc);

alter table public.ai_quota_config enable row level security;
alter table public.ai_usage_daily enable row level security;
alter table public.ai_action_logs enable row level security;

revoke all on table public.ai_quota_config from anon, authenticated;
revoke all on table public.ai_usage_daily from anon, authenticated;
revoke all on table public.ai_action_logs from anon, authenticated;

create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_ip_hash text,
  p_is_anonymous boolean,
  p_reserved_tokens integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.ai_quota_config%rowtype;
  v_user_messages integer;
  v_user_tokens bigint;
  v_ip_messages integer;
  v_ip_tokens bigint;
  v_user_message_limit integer;
  v_user_token_limit bigint;
  v_ip_message_limit integer;
  v_ip_token_limit bigint;
  v_retry_after integer;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'AI quota user mismatch' using errcode = '42501';
  end if;

  if p_reserved_tokens < 0 or p_reserved_tokens > 20000 then
    raise exception 'AI quota token reservation is invalid' using errcode = '22023';
  end if;

  select * into v_config
  from public.ai_quota_config
  where singleton is true;

  if not found then
    raise exception 'AI quota configuration is missing' using errcode = 'P0001';
  end if;

  v_user_message_limit := case when p_is_anonymous
    then v_config.anonymous_daily_messages
    else v_config.authenticated_daily_messages end;
  v_user_token_limit := case when p_is_anonymous
    then v_config.anonymous_daily_tokens
    else v_config.authenticated_daily_tokens end;
  v_ip_message_limit := case when p_is_anonymous
    then v_config.anonymous_ip_daily_messages
    else v_config.authenticated_ip_daily_messages end;
  v_ip_token_limit := case when p_is_anonymous
    then v_config.anonymous_ip_daily_tokens
    else v_config.authenticated_ip_daily_tokens end;
  v_retry_after := greatest(1, extract(epoch from (
    date_trunc('day', timezone('utc', now())) + interval '1 day' - timezone('utc', now())
  ))::integer);

  insert into public.ai_usage_daily (
    usage_date, bucket_scope, bucket_key, user_id, is_anonymous
  ) values (
    timezone('utc', now())::date, 'user', p_user_id::text, p_user_id, p_is_anonymous
  ) on conflict (usage_date, bucket_scope, bucket_key) do nothing;

  select messages_used, reserved_tokens
    into v_user_messages, v_user_tokens
  from public.ai_usage_daily
  where usage_date = timezone('utc', now())::date
    and bucket_scope = 'user'
    and bucket_key = p_user_id::text
  for update;

  if p_ip_hash is not null then
    insert into public.ai_usage_daily (
      usage_date, bucket_scope, bucket_key, ip_hash, is_anonymous
    ) values (
      timezone('utc', now())::date, 'ip', p_ip_hash, p_ip_hash, p_is_anonymous
    ) on conflict (usage_date, bucket_scope, bucket_key) do nothing;

    select messages_used, reserved_tokens
      into v_ip_messages, v_ip_tokens
    from public.ai_usage_daily
    where usage_date = timezone('utc', now())::date
      and bucket_scope = 'ip'
      and bucket_key = p_ip_hash
    for update;
  end if;

  if v_user_messages + 1 > v_user_message_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'user_messages',
      'retry_after_seconds', v_retry_after,
      'user_remaining_messages', greatest(0, v_user_message_limit - v_user_messages)
    );
  end if;

  if v_user_tokens + p_reserved_tokens > v_user_token_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'user_tokens',
      'retry_after_seconds', v_retry_after,
      'user_remaining_messages', greatest(0, v_user_message_limit - v_user_messages)
    );
  end if;

  if p_ip_hash is not null and v_ip_messages + 1 > v_ip_message_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'ip_messages',
      'retry_after_seconds', v_retry_after,
      'ip_remaining_messages', greatest(0, v_ip_message_limit - v_ip_messages)
    );
  end if;

  if p_ip_hash is not null and v_ip_tokens + p_reserved_tokens > v_ip_token_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'ip_tokens',
      'retry_after_seconds', v_retry_after,
      'ip_remaining_messages', greatest(0, v_ip_message_limit - v_ip_messages)
    );
  end if;

  update public.ai_usage_daily
  set messages_used = messages_used + 1,
      reserved_tokens = reserved_tokens + p_reserved_tokens,
      is_anonymous = p_is_anonymous,
      last_used_at = now()
  where usage_date = timezone('utc', now())::date
    and bucket_scope = 'user'
    and bucket_key = p_user_id::text;

  if p_ip_hash is not null then
    update public.ai_usage_daily
    set messages_used = messages_used + 1,
        reserved_tokens = reserved_tokens + p_reserved_tokens,
        is_anonymous = p_is_anonymous,
        last_used_at = now()
    where usage_date = timezone('utc', now())::date
      and bucket_scope = 'ip'
      and bucket_key = p_ip_hash;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'user_remaining_messages', greatest(0, v_user_message_limit - v_user_messages - 1),
    'ip_remaining_messages', case when p_ip_hash is null then null
      else greatest(0, v_ip_message_limit - v_ip_messages - 1) end
  );
end;
$$;

create or replace function public.record_ai_request(
  p_user_id uuid,
  p_is_anonymous boolean,
  p_ip_hash text,
  p_provider text,
  p_model text,
  p_duration_ms integer,
  p_input_tokens integer,
  p_output_tokens integer,
  p_tool_calls integer,
  p_status text,
  p_error_code text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'AI telemetry user mismatch' using errcode = '42501';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is distinct from p_is_anonymous then
    raise exception 'AI telemetry actor mismatch' using errcode = '42501';
  end if;

  insert into public.ai_action_logs (
    user_id, is_anonymous, ip_hash, provider, model, duration_ms,
    input_tokens, output_tokens, tool_calls, status, error_code
  ) values (
    p_user_id, p_is_anonymous, p_ip_hash, p_provider, left(p_model, 160),
    greatest(p_duration_ms, 0), greatest(p_input_tokens, 0), greatest(p_output_tokens, 0),
    greatest(p_tool_calls, 0), p_status, left(p_error_code, 100)
  );
end;
$$;

revoke all on function public.consume_ai_quota(uuid, text, boolean, integer) from public, anon;
revoke all on function public.record_ai_request(uuid, boolean, text, text, text, integer, integer, integer, integer, text, text) from public, anon;
grant execute on function public.consume_ai_quota(uuid, text, boolean, integer) to authenticated;
grant execute on function public.record_ai_request(uuid, boolean, text, text, text, integer, integer, integer, integer, text, text) to authenticated;
