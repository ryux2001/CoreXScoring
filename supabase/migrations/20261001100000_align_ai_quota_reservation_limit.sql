-- Supports the expanded generation allowance without changing daily quotas or data.
begin;

alter table public.ai_quota_reservations
  drop constraint ai_quota_reservations_reserved_tokens_check;
alter table public.ai_quota_reservations
  add constraint ai_quota_reservations_reserved_tokens_check
  check (reserved_tokens between 0 and 30000);

create or replace function public.reserve_ai_quota(
  p_request_id uuid,
  p_user_id uuid,
  p_ip_hash text,
  p_is_anonymous boolean,
  p_reserved_tokens integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_usage_date date := timezone('utc', now())::date;
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
  v_reservation_id uuid;
begin
  if p_request_id is null or p_user_id is null or p_reserved_tokens is null
    or p_reserved_tokens < 0 or p_reserved_tokens > 30000 then
    raise exception 'AI quota reservation is invalid' using errcode = '22023';
  end if;

  select * into v_config from public.ai_quota_config where singleton is true;
  if not found then raise exception 'AI quota configuration is missing' using errcode = 'P0001'; end if;

  v_user_message_limit := case when p_is_anonymous then v_config.anonymous_daily_messages else v_config.authenticated_daily_messages end;
  v_user_token_limit := case when p_is_anonymous then v_config.anonymous_daily_tokens else v_config.authenticated_daily_tokens end;
  v_ip_message_limit := case when p_is_anonymous then v_config.anonymous_ip_daily_messages else v_config.authenticated_ip_daily_messages end;
  v_ip_token_limit := case when p_is_anonymous then v_config.anonymous_ip_daily_tokens else v_config.authenticated_ip_daily_tokens end;
  v_retry_after := greatest(1, extract(epoch from (date_trunc('day', timezone('utc', now())) + interval '1 day' - timezone('utc', now())))::integer);

  insert into public.ai_usage_daily (usage_date, bucket_scope, bucket_key, user_id, is_anonymous)
  values (v_usage_date, 'user', p_user_id::text, p_user_id, p_is_anonymous)
  on conflict (usage_date, bucket_scope, bucket_key) do nothing;

  select messages_used, reserved_tokens into v_user_messages, v_user_tokens
  from public.ai_usage_daily
  where usage_date = v_usage_date and bucket_scope = 'user' and bucket_key = p_user_id::text
  for update;

  if p_ip_hash is not null then
    insert into public.ai_usage_daily (usage_date, bucket_scope, bucket_key, ip_hash, is_anonymous)
    values (v_usage_date, 'ip', p_ip_hash, p_ip_hash, p_is_anonymous)
    on conflict (usage_date, bucket_scope, bucket_key) do nothing;

    select messages_used, reserved_tokens into v_ip_messages, v_ip_tokens
    from public.ai_usage_daily
    where usage_date = v_usage_date and bucket_scope = 'ip' and bucket_key = p_ip_hash
    for update;
  end if;

  if v_user_messages + 1 > v_user_message_limit then
    return jsonb_build_object('allowed', false, 'reason', 'user_messages', 'retry_after_seconds', v_retry_after);
  end if;
  if v_user_tokens + p_reserved_tokens > v_user_token_limit then
    return jsonb_build_object('allowed', false, 'reason', 'user_tokens', 'retry_after_seconds', v_retry_after);
  end if;
  if p_ip_hash is not null and v_ip_messages + 1 > v_ip_message_limit then
    return jsonb_build_object('allowed', false, 'reason', 'ip_messages', 'retry_after_seconds', v_retry_after);
  end if;
  if p_ip_hash is not null and v_ip_tokens + p_reserved_tokens > v_ip_token_limit then
    return jsonb_build_object('allowed', false, 'reason', 'ip_tokens', 'retry_after_seconds', v_retry_after);
  end if;

  insert into public.ai_quota_reservations (
    request_id, user_id, ip_hash, is_anonymous, usage_date, reserved_tokens
  ) values (
    p_request_id, p_user_id, p_ip_hash, p_is_anonymous, v_usage_date, p_reserved_tokens
  ) returning id into v_reservation_id;

  update public.ai_usage_daily
  set messages_used = messages_used + 1,
      reserved_tokens = reserved_tokens + p_reserved_tokens,
      is_anonymous = p_is_anonymous,
      last_used_at = now()
  where usage_date = v_usage_date and bucket_scope = 'user' and bucket_key = p_user_id::text;

  if p_ip_hash is not null then
    update public.ai_usage_daily
    set messages_used = messages_used + 1,
        reserved_tokens = reserved_tokens + p_reserved_tokens,
        is_anonymous = p_is_anonymous,
        last_used_at = now()
    where usage_date = v_usage_date and bucket_scope = 'ip' and bucket_key = p_ip_hash;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'reservation_id', v_reservation_id,
    'user_remaining_messages', greatest(0, v_user_message_limit - v_user_messages - 1),
    'ip_remaining_messages', case when p_ip_hash is null then null else greatest(0, v_ip_message_limit - v_ip_messages - 1) end
  );
end;
$$;

revoke all on function public.reserve_ai_quota(uuid, uuid, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_quota(uuid, uuid, text, boolean, integer) to service_role;

commit;
