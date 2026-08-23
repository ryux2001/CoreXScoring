-- CoreX AI: diagnóstico mínimo para diferenciar proveedor, protocolo de tools
-- y respuestas cortadas, sin almacenar mensajes ni credenciales.

alter table public.ai_action_logs
  add column if not exists failure_stage text,
  add column if not exists provider_http_status smallint,
  add column if not exists finish_reason text;

create or replace function public.record_ai_request_v2(
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
  p_error_code text default null,
  p_failure_stage text default null,
  p_provider_http_status smallint default null,
  p_finish_reason text default null
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
    input_tokens, output_tokens, tool_calls, status, error_code,
    failure_stage, provider_http_status, finish_reason
  ) values (
    p_user_id, p_is_anonymous, p_ip_hash, p_provider, left(p_model, 160),
    greatest(p_duration_ms, 0), greatest(p_input_tokens, 0), greatest(p_output_tokens, 0),
    greatest(p_tool_calls, 0), p_status, left(p_error_code, 100),
    left(p_failure_stage, 40),
    case when p_provider_http_status between 100 and 599 then p_provider_http_status else null end,
    left(p_finish_reason, 40)
  );
end;
$$;

revoke all on function public.record_ai_request_v2(
  uuid, boolean, text, text, text, integer, integer, integer, integer, text, text, text, smallint, text
) from public, anon;
grant execute on function public.record_ai_request_v2(
  uuid, boolean, text, text, text, integer, integer, integer, integer, text, text, text, smallint, text
) to authenticated;
