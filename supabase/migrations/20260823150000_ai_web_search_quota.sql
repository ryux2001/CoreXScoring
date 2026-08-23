-- CoreX AI Fase 6: cuota independiente para búsquedas externas con Tavily.
-- Aplicar después de las migraciones de cuotas de Fase 4.

alter table public.ai_quota_config
  add column if not exists anonymous_daily_web_searches integer not null default 3 check (anonymous_daily_web_searches > 0),
  add column if not exists authenticated_daily_web_searches integer not null default 10 check (authenticated_daily_web_searches > 0),
  add column if not exists anonymous_ip_daily_web_searches integer not null default 6 check (anonymous_ip_daily_web_searches > 0),
  add column if not exists authenticated_ip_daily_web_searches integer not null default 20 check (authenticated_ip_daily_web_searches > 0);

alter table public.ai_usage_daily
  add column if not exists web_searches_used integer not null default 0 check (web_searches_used >= 0);

create or replace function public.consume_ai_web_search_quota(
  p_user_id uuid,
  p_ip_hash text,
  p_is_anonymous boolean,
  p_units integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.ai_quota_config%rowtype;
  v_user_used integer;
  v_ip_used integer;
  v_user_limit integer;
  v_ip_limit integer;
  v_retry_after integer;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'AI web search quota user mismatch' using errcode = '42501';
  end if;

  if p_units < 1 or p_units > 2 then
    raise exception 'AI web search quota units are invalid' using errcode = '22023';
  end if;

  select * into v_config
  from public.ai_quota_config
  where singleton is true;

  if not found then
    raise exception 'AI quota configuration is missing' using errcode = 'P0001';
  end if;

  v_user_limit := case when p_is_anonymous
    then v_config.anonymous_daily_web_searches
    else v_config.authenticated_daily_web_searches end;
  v_ip_limit := case when p_is_anonymous
    then v_config.anonymous_ip_daily_web_searches
    else v_config.authenticated_ip_daily_web_searches end;
  v_retry_after := greatest(1, extract(epoch from (
    date_trunc('day', timezone('utc', now())) + interval '1 day' - timezone('utc', now())
  ))::integer);

  insert into public.ai_usage_daily (
    usage_date, bucket_scope, bucket_key, user_id, is_anonymous
  ) values (
    timezone('utc', now())::date, 'user', p_user_id::text, p_user_id, p_is_anonymous
  ) on conflict (usage_date, bucket_scope, bucket_key) do nothing;

  select web_searches_used into v_user_used
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

    select web_searches_used into v_ip_used
    from public.ai_usage_daily
    where usage_date = timezone('utc', now())::date
      and bucket_scope = 'ip'
      and bucket_key = p_ip_hash
    for update;
  end if;

  if v_user_used + p_units > v_user_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'user_web_searches',
      'retry_after_seconds', v_retry_after,
      'user_remaining_searches', greatest(0, v_user_limit - v_user_used),
      'ip_remaining_searches', case when p_ip_hash is null then null else greatest(0, v_ip_limit - coalesce(v_ip_used, 0)) end
    );
  end if;

  if p_ip_hash is not null and v_ip_used + p_units > v_ip_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'ip_web_searches',
      'retry_after_seconds', v_retry_after,
      'user_remaining_searches', greatest(0, v_user_limit - v_user_used),
      'ip_remaining_searches', greatest(0, v_ip_limit - v_ip_used)
    );
  end if;

  update public.ai_usage_daily
  set web_searches_used = web_searches_used + p_units,
      is_anonymous = p_is_anonymous,
      last_used_at = now()
  where usage_date = timezone('utc', now())::date
    and bucket_scope = 'user'
    and bucket_key = p_user_id::text;

  if p_ip_hash is not null then
    update public.ai_usage_daily
    set web_searches_used = web_searches_used + p_units,
        is_anonymous = p_is_anonymous,
        last_used_at = now()
    where usage_date = timezone('utc', now())::date
      and bucket_scope = 'ip'
      and bucket_key = p_ip_hash;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'user_remaining_searches', greatest(0, v_user_limit - v_user_used - p_units),
    'ip_remaining_searches', case when p_ip_hash is null then null else greatest(0, v_ip_limit - v_ip_used - p_units) end
  );
end;
$$;

revoke all on function public.consume_ai_web_search_quota(uuid, text, boolean, integer) from public, anon;
grant execute on function public.consume_ai_web_search_quota(uuid, text, boolean, integer) to authenticated;
