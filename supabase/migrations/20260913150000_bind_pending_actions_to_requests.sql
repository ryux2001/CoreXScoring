begin;

alter table public.ai_pending_actions
  add column if not exists request_id uuid;

create index if not exists ai_pending_actions_request_id_idx
  on public.ai_pending_actions (request_id)
  where request_id is not null;

drop function if exists public.create_ai_pending_action_server(uuid, text, jsonb, text, timestamp with time zone);

create function public.create_ai_pending_action_server (
  p_request_id     uuid,
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
  if p_request_id is null or p_user_id is null then
    raise exception 'AI pending action request and user are required' using errcode = '22023';
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

  insert into public.ai_pending_actions (request_id, user_id, action_type, payload, payload_digest, expires_at)
  values (p_request_id, p_user_id, p_action_type, p_payload, lower(p_payload_digest), p_expires_at)
  returning id into v_id;
  return v_id;
end;
$function$;

revoke all on function public.create_ai_pending_action_server(uuid, uuid, text, jsonb, text, timestamp with time zone) from public, anon, authenticated;
grant execute on function public.create_ai_pending_action_server(uuid, uuid, text, jsonb, text, timestamp with time zone) to service_role;

commit;
