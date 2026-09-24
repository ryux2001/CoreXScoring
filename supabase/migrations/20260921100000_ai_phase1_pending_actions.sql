begin;

alter table public.ai_pending_actions
  add column if not exists summary jsonb not null default '{}'::jsonb,
  add column if not exists execution_started_at timestamp with time zone;

alter table public.created_builds
  add column if not exists ai_pending_action_id uuid;

alter table public.created_combos
  add column if not exists ai_pending_action_id uuid;

create unique index if not exists created_builds_ai_pending_action_id_key
  on public.created_builds (ai_pending_action_id)
  where ai_pending_action_id is not null;

create unique index if not exists created_combos_ai_pending_action_id_key
  on public.created_combos (ai_pending_action_id)
  where ai_pending_action_id is not null;

create or replace function public.create_ai_pending_action_server_v2 (
  p_request_id     uuid,
  p_user_id        uuid,
  p_action_type    text,
  p_payload        jsonb,
  p_payload_digest text,
  p_summary        jsonb,
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
    or p_summary is null
    or jsonb_typeof(p_summary) <> 'object'
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

  insert into public.ai_pending_actions (
    request_id,
    user_id,
    action_type,
    payload,
    summary,
    payload_digest,
    expires_at
  )
  values (
    p_request_id,
    p_user_id,
    p_action_type,
    p_payload,
    p_summary,
    lower(p_payload_digest),
    p_expires_at
  )
  returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.get_ai_pending_actions ()
returns table (
  id uuid,
  action_type text,
  summary jsonb,
  payload_digest text,
  expires_at timestamp with time zone,
  status text,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path to 'pg_catalog, public'
as $function$
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'AI pending actions require a permanent account' using errcode = '42501';
  end if;

  return query
  select action.id, action.action_type, action.summary, action.payload_digest,
         action.expires_at, action.status, action.created_at
  from public.ai_pending_actions action
  where action.user_id = auth.uid()
    and action.consumed_at is null
    and action.expires_at > now()
    and action.status in ('pending', 'failed')
  order by action.created_at desc;
end;
$function$;

create or replace function public.claim_ai_pending_action(p_action_id uuid, p_payload_digest text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare action_row public.ai_pending_actions%rowtype;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'AI pending action requires a permanent account' using errcode = '42501';
  end if;
  select * into action_row from public.ai_pending_actions
  where id = p_action_id and user_id = auth.uid() and payload_digest = lower(p_payload_digest)
    and consumed_at is null and expires_at > now()
    and (
      status in ('pending', 'failed')
      or (status = 'executing' and execution_started_at < now() - interval '5 minutes')
    )
  for update;
  if not found then raise exception 'AI pending action is expired, consumed, cancelled or inaccessible' using errcode = 'P0002'; end if;
  update public.ai_pending_actions
  set status = 'executing', execution_started_at = now()
  where id = action_row.id;
  return jsonb_build_object('action_type', action_row.action_type, 'payload', action_row.payload);
end; $$;

create or replace function public.finalize_ai_pending_action(p_action_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  update public.ai_pending_actions
  set status = 'completed', consumed_at = now(), execution_started_at = null
  where id = p_action_id and user_id = auth.uid() and status = 'executing' and consumed_at is null;
  if not found then raise exception 'AI pending action cannot be finalized' using errcode = 'P0002'; end if;
end; $$;

create or replace function public.fail_ai_pending_action(p_action_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  update public.ai_pending_actions
  set status = 'failed', execution_started_at = null
  where id = p_action_id and user_id = auth.uid() and status = 'executing' and consumed_at is null;
end; $$;

create or replace function public.cancel_ai_pending_action(p_action_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  update public.ai_pending_actions
  set status = 'cancelled', execution_started_at = null
  where id = p_action_id and user_id = auth.uid()
    and status in ('pending', 'failed') and consumed_at is null;
  if not found then raise exception 'AI pending action cannot be cancelled' using errcode = 'P0002'; end if;
end; $$;

revoke all on function public.create_ai_pending_action_server_v2(uuid, uuid, text, jsonb, text, jsonb, timestamp with time zone) from public, anon, authenticated;
revoke all on function public.get_ai_pending_actions() from public, anon;
grant execute on function public.create_ai_pending_action_server_v2(uuid, uuid, text, jsonb, text, jsonb, timestamp with time zone) to service_role;
grant execute on function public.get_ai_pending_actions() to authenticated;

commit;
