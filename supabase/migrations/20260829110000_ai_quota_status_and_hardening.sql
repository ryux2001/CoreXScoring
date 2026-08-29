-- CoreX AI: estado de cuota visible y protección de la clasificación de sesión.

create or replace function public.get_my_ai_quota_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_anonymous boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_config public.ai_quota_config%rowtype;
  v_messages_used integer := 0;
  v_tokens_used bigint := 0;
  v_message_limit integer;
  v_token_limit bigint;
  v_reset_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'AI quota status requires an authenticated session' using errcode = '42501';
  end if;

  select * into v_config
  from public.ai_quota_config
  where singleton is true;

  if not found then
    raise exception 'AI quota configuration is missing' using errcode = 'P0001';
  end if;

  v_message_limit := case when v_is_anonymous
    then v_config.anonymous_daily_messages
    else v_config.authenticated_daily_messages end;
  v_token_limit := case when v_is_anonymous
    then v_config.anonymous_daily_tokens
    else v_config.authenticated_daily_tokens end;

  select messages_used, reserved_tokens
    into v_messages_used, v_tokens_used
  from public.ai_usage_daily
  where usage_date = timezone('utc', now())::date
    and bucket_scope = 'user'
    and bucket_key = v_user_id::text;

  v_messages_used := coalesce(v_messages_used, 0);
  v_tokens_used := coalesce(v_tokens_used, 0);
  v_reset_at := (date_trunc('day', now() at time zone 'utc') + interval '1 day') at time zone 'utc';

  return jsonb_build_object(
    'is_anonymous', v_is_anonymous,
    'messages_used', v_messages_used,
    'messages_limit', v_message_limit,
    'messages_remaining', greatest(0, v_message_limit - v_messages_used),
    'tokens_used', v_tokens_used,
    'tokens_limit', v_token_limit,
    'tokens_remaining', greatest(0, v_token_limit - v_tokens_used),
    'reset_at', v_reset_at
  );
end;
$$;

revoke all on function public.get_my_ai_quota_status() from public, anon;
grant execute on function public.get_my_ai_quota_status() to authenticated;

-- La cuota no debe poder elevarse declarando una sesión anónima como registrada.
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
  v_is_anonymous boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'AI quota user mismatch' using errcode = '42501';
  end if;

  if p_is_anonymous is distinct from v_is_anonymous then
    raise exception 'AI quota actor mismatch' using errcode = '42501';
  end if;

  if p_reserved_tokens < 0 or p_reserved_tokens > 20000 then
    raise exception 'AI quota token reservation is invalid' using errcode = '22023';
  end if;

  select * into v_config from public.ai_quota_config where singleton is true;
  if not found then raise exception 'AI quota configuration is missing' using errcode = 'P0001'; end if;

  v_user_message_limit := case when v_is_anonymous then v_config.anonymous_daily_messages else v_config.authenticated_daily_messages end;
  v_user_token_limit := case when v_is_anonymous then v_config.anonymous_daily_tokens else v_config.authenticated_daily_tokens end;
  v_ip_message_limit := case when v_is_anonymous then v_config.anonymous_ip_daily_messages else v_config.authenticated_ip_daily_messages end;
  v_ip_token_limit := case when v_is_anonymous then v_config.anonymous_ip_daily_tokens else v_config.authenticated_ip_daily_tokens end;
  v_retry_after := greatest(1, extract(epoch from (date_trunc('day', timezone('utc', now())) + interval '1 day' - timezone('utc', now())))::integer);

  insert into public.ai_usage_daily (usage_date, bucket_scope, bucket_key, user_id, is_anonymous)
  values (timezone('utc', now())::date, 'user', p_user_id::text, p_user_id, v_is_anonymous)
  on conflict (usage_date, bucket_scope, bucket_key) do nothing;

  select messages_used, reserved_tokens into v_user_messages, v_user_tokens
  from public.ai_usage_daily
  where usage_date = timezone('utc', now())::date and bucket_scope = 'user' and bucket_key = p_user_id::text
  for update;

  if p_ip_hash is not null then
    insert into public.ai_usage_daily (usage_date, bucket_scope, bucket_key, ip_hash, is_anonymous)
    values (timezone('utc', now())::date, 'ip', p_ip_hash, p_ip_hash, v_is_anonymous)
    on conflict (usage_date, bucket_scope, bucket_key) do nothing;
    select messages_used, reserved_tokens into v_ip_messages, v_ip_tokens
    from public.ai_usage_daily
    where usage_date = timezone('utc', now())::date and bucket_scope = 'ip' and bucket_key = p_ip_hash
    for update;
  end if;

  if v_user_messages + 1 > v_user_message_limit then
    return jsonb_build_object('allowed', false, 'reason', 'user_messages', 'retry_after_seconds', v_retry_after, 'user_remaining_messages', greatest(0, v_user_message_limit - v_user_messages));
  end if;
  if v_user_tokens + p_reserved_tokens > v_user_token_limit then
    return jsonb_build_object('allowed', false, 'reason', 'user_tokens', 'retry_after_seconds', v_retry_after, 'user_remaining_messages', greatest(0, v_user_message_limit - v_user_messages));
  end if;
  if p_ip_hash is not null and v_ip_messages + 1 > v_ip_message_limit then
    return jsonb_build_object('allowed', false, 'reason', 'ip_messages', 'retry_after_seconds', v_retry_after, 'ip_remaining_messages', greatest(0, v_ip_message_limit - v_ip_messages));
  end if;
  if p_ip_hash is not null and v_ip_tokens + p_reserved_tokens > v_ip_token_limit then
    return jsonb_build_object('allowed', false, 'reason', 'ip_tokens', 'retry_after_seconds', v_retry_after, 'ip_remaining_messages', greatest(0, v_ip_message_limit - v_ip_messages));
  end if;

  update public.ai_usage_daily set messages_used = messages_used + 1, reserved_tokens = reserved_tokens + p_reserved_tokens, is_anonymous = v_is_anonymous, last_used_at = now()
  where usage_date = timezone('utc', now())::date and bucket_scope = 'user' and bucket_key = p_user_id::text;
  if p_ip_hash is not null then
    update public.ai_usage_daily set messages_used = messages_used + 1, reserved_tokens = reserved_tokens + p_reserved_tokens, is_anonymous = v_is_anonymous, last_used_at = now()
    where usage_date = timezone('utc', now())::date and bucket_scope = 'ip' and bucket_key = p_ip_hash;
  end if;

  return jsonb_build_object('allowed', true, 'user_remaining_messages', greatest(0, v_user_message_limit - v_user_messages - 1), 'ip_remaining_messages', case when p_ip_hash is null then null else greatest(0, v_ip_message_limit - v_ip_messages - 1) end);
end;
$$;
