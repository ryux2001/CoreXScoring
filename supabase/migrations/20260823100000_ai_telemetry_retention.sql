-- CoreX AI Fase 4: limpieza explícita de telemetría antigua.
-- La función no se ejecuta automáticamente; debe invocarse desde un job confiable
-- o manualmente por un administrador después de revisar la política de retención.

create or replace function public.cleanup_ai_telemetry(
  p_retention_days integer default 90
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retention_days integer := greatest(30, least(coalesce(p_retention_days, 90), 730));
  v_deleted_logs bigint;
  v_deleted_usage bigint;
begin
  if auth.uid() is null
    or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'AI telemetry cleanup access denied' using errcode = '42501';
  end if;

  delete from public.ai_action_logs
  where created_at < now() - make_interval(days => v_retention_days);
  get diagnostics v_deleted_logs = row_count;

  delete from public.ai_usage_daily
  where usage_date < timezone('utc', now())::date - v_retention_days;
  get diagnostics v_deleted_usage = row_count;

  return jsonb_build_object(
    'retention_days', v_retention_days,
    'deleted_action_logs', v_deleted_logs,
    'deleted_usage_daily', v_deleted_usage
  );
end;
$$;

revoke all on function public.cleanup_ai_telemetry(integer) from public, anon;
grant execute on function public.cleanup_ai_telemetry(integer) to authenticated;
