-- Quota reservations are server-controlled and can be settled exactly once.
begin;

create table public.ai_quota_reservations (
  id uuid not null default gen_random_uuid(),
  request_id uuid not null,
  user_id uuid not null,
  ip_hash text,
  is_anonymous boolean not null,
  usage_date date not null,
  reserved_tokens integer not null,
  actual_tokens integer,
  state text not null default 'pending',
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null default now() + interval '15 minutes',
  settled_at timestamp with time zone,
  constraint ai_quota_reservations_pkey primary key (id),
  constraint ai_quota_reservations_request_id_key unique (request_id),
  constraint ai_quota_reservations_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint ai_quota_reservations_reserved_tokens_check check (reserved_tokens between 0 and 20000),
  constraint ai_quota_reservations_actual_tokens_check check (actual_tokens is null or actual_tokens between 0 and 1000000),
  constraint ai_quota_reservations_state_check check (state in ('pending', 'settled', 'expired')),
  constraint ai_quota_reservations_expiry_check check (expires_at > created_at),
  constraint ai_quota_reservations_settlement_check check (
    (state = 'pending' and actual_tokens is null and settled_at is null)
    or (state = 'settled' and actual_tokens is not null and settled_at is not null)
    or (state = 'expired' and actual_tokens is null and settled_at is null)
  )
);

create index ai_quota_reservations_pending_expiry_idx
  on public.ai_quota_reservations (expires_at)
  where state = 'pending';

alter table public.ai_quota_reservations enable row level security;

revoke all on table public.ai_quota_reservations from public, anon, authenticated;
grant all on table public.ai_quota_reservations to service_role;

revoke all on function public.consume_ai_quota(uuid, text, boolean, integer) from public, anon, authenticated, service_role;
revoke all on function public.settle_ai_quota(uuid, text, integer, integer) from public, anon, authenticated, service_role;

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
  if p_request_id is null or p_user_id is null or p_reserved_tokens < 0 or p_reserved_tokens > 20000 then
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

create or replace function public.settle_ai_quota_reservation(
  p_reservation_id uuid,
  p_actual_tokens integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reservation public.ai_quota_reservations%rowtype;
  v_delta integer;
begin
  if p_reservation_id is null or p_actual_tokens < 0 or p_actual_tokens > 1000000 then
    raise exception 'AI quota settlement is invalid' using errcode = '22023';
  end if;

  select * into v_reservation from public.ai_quota_reservations where id = p_reservation_id for update;
  if not found then raise exception 'AI quota reservation does not exist' using errcode = 'P0002'; end if;
  if v_reservation.state <> 'pending' then raise exception 'AI quota reservation is already finalized' using errcode = 'P0001'; end if;
  if v_reservation.expires_at <= now() then
    update public.ai_quota_reservations set state = 'expired' where id = v_reservation.id;
    raise exception 'AI quota reservation has expired' using errcode = 'P0001';
  end if;

  v_delta := p_actual_tokens - v_reservation.reserved_tokens;
  update public.ai_usage_daily
  set reserved_tokens = greatest(0, reserved_tokens + v_delta), last_used_at = now()
  where usage_date = v_reservation.usage_date and bucket_scope = 'user' and bucket_key = v_reservation.user_id::text;

  if v_reservation.ip_hash is not null then
    update public.ai_usage_daily
    set reserved_tokens = greatest(0, reserved_tokens + v_delta), last_used_at = now()
    where usage_date = v_reservation.usage_date and bucket_scope = 'ip' and bucket_key = v_reservation.ip_hash;
  end if;

  update public.ai_quota_reservations
  set state = 'settled', actual_tokens = p_actual_tokens, settled_at = now()
  where id = v_reservation.id;
end;
$$;

revoke all on function public.reserve_ai_quota(uuid, uuid, text, boolean, integer) from public, anon, authenticated;
revoke all on function public.settle_ai_quota_reservation(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_quota(uuid, uuid, text, boolean, integer) to service_role;
grant execute on function public.settle_ai_quota_reservation(uuid, integer) to service_role;

commit;
