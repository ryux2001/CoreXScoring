-- CoreX AI Fase 4: consulta administrativa protegida por app_metadata.role.

create or replace function public.get_ai_admin_usage(p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 7), 31));
  v_role text;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role';

  if v_role is distinct from 'admin' then
    raise exception 'AI admin access denied' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'days', v_days,
    'config', coalesce((
      select to_jsonb(config_row) - 'singleton'
      from public.ai_quota_config as config_row
      where config_row.singleton is true
    ), '{}'::jsonb),
    'daily_usage', coalesce((
      select jsonb_agg(to_jsonb(daily_row) order by daily_row.usage_date desc)
      from (
        select
          usage_date,
          coalesce(sum(messages_used) filter (where bucket_scope = 'user'), 0) as user_messages,
          coalesce(sum(reserved_tokens) filter (where bucket_scope = 'user'), 0) as user_reserved_tokens,
          count(*) filter (where bucket_scope = 'ip') as ip_buckets
        from public.ai_usage_daily
        where usage_date >= current_date - (v_days - 1)
        group by usage_date
      ) as daily_row
    ), '[]'::jsonb),
    'providers', coalesce((
      select jsonb_agg(to_jsonb(provider_row) order by provider_row.requests desc)
      from (
        select
          provider,
          status,
          count(*) as requests,
          coalesce(sum(input_tokens + output_tokens), 0) as tokens,
          round(avg(duration_ms)) as average_duration_ms
        from public.ai_action_logs
        where created_at >= now() - make_interval(days => v_days)
        group by provider, status
      ) as provider_row
    ), '[]'::jsonb),
    'errors', coalesce((
      select jsonb_agg(to_jsonb(error_row) order by error_row.failures desc)
      from (
        select
          coalesce(error_code, 'unknown') as error_code,
          count(*) as failures
        from public.ai_action_logs
        where created_at >= now() - make_interval(days => v_days)
          and status = 'error'
        group by error_code
      ) as error_row
    ), '[]'::jsonb),
    'top_ip_buckets', coalesce((
      select jsonb_agg(to_jsonb(ip_row) order by ip_row.requests desc)
      from (
        select ip_hash, count(*) as requests
        from public.ai_action_logs
        where created_at >= now() - make_interval(days => v_days)
          and ip_hash is not null
        group by ip_hash
        order by count(*) desc
        limit 10
      ) as ip_row
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_ai_admin_usage(integer) from public, anon;
grant execute on function public.get_ai_admin_usage(integer) to authenticated;
