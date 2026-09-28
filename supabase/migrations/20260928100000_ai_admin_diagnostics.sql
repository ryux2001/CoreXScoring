begin;

create or replace function public.get_ai_admin_usage (
  p_days integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    'limits', coalesce((
      select jsonb_build_object(
        'request_rate_limit_per_minute', 30,
        'request_rate_window_seconds', 60,
        'global_concurrency_limit', abuse_row.global_concurrency_limit,
        'user_concurrency_limit', abuse_row.user_concurrency_limit,
        'anonymous_ip_concurrency_limit', abuse_row.anonymous_ip_concurrency_limit,
        'active_pending_actions_limit', abuse_row.active_pending_actions_limit,
        'circuit_failure_threshold', abuse_row.circuit_failure_threshold,
        'circuit_timeout_threshold', abuse_row.circuit_timeout_threshold,
        'circuit_window_seconds', abuse_row.circuit_window_seconds,
        'circuit_cooldown_seconds', abuse_row.circuit_cooldown_seconds
      )
      from public.ai_abuse_config as abuse_row
      where abuse_row.singleton is true
    ), '{}'::jsonb),
    'budget', coalesce((
      select jsonb_build_object(
        'daily_limit_microusd', budget_row.openrouter_daily_limit_microusd,
        'monthly_limit_microusd', budget_row.openrouter_monthly_limit_microusd,
        'daily_used_microusd', coalesce((
          select usage_row.reserved_microusd
          from public.ai_provider_budget_usage as usage_row
          where usage_row.provider = 'openrouter'
            and usage_row.period_kind = 'day'
            and usage_row.period_start = timezone('utc', now())::date
        ), 0),
        'monthly_used_microusd', coalesce((
          select usage_row.reserved_microusd
          from public.ai_provider_budget_usage as usage_row
          where usage_row.provider = 'openrouter'
            and usage_row.period_kind = 'month'
            and usage_row.period_start = date_trunc('month', timezone('utc', now()))::date
        ), 0)
      )
      from public.ai_provider_budget_config as budget_row
      where budget_row.singleton is true
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
        where usage_date >= timezone('utc', now())::date - (v_days - 1)
        group by usage_date
      ) as daily_row
    ), '[]'::jsonb),
    'daily_issues', coalesce((
      select jsonb_agg(to_jsonb(issue_row) order by issue_row.issue_date desc)
      from (
        select
          timezone('utc', created_at)::date as issue_date,
          count(*) filter (where status = 'error') as errors,
          count(*) filter (where status = 'rate_limited') as rate_limited,
          count(*) as total
        from public.ai_action_logs
        where timezone('utc', created_at)::date >= timezone('utc', now())::date - (v_days - 1)
          and status in ('error', 'rate_limited')
        group by timezone('utc', created_at)::date
      ) as issue_row
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
    'recent_errors', coalesce((
      select jsonb_agg(to_jsonb(error_row) order by error_row.created_at desc)
      from (
        select
          created_at,
          coalesce(error_code, 'unknown') as error_code,
          provider,
          model,
          failure_stage,
          provider_http_status,
          finish_reason
        from public.ai_action_logs
        where created_at >= now() - make_interval(days => v_days)
          and status = 'error'
        order by created_at desc
        limit 100
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
$function$;

commit;
