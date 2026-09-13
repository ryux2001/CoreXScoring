begin;

alter table public.ai_pending_actions
  add column if not exists status text not null default 'pending';

alter table public.ai_pending_actions
  drop constraint if exists ai_pending_actions_status_check;

alter table public.ai_pending_actions
  add constraint ai_pending_actions_status_check
  check (status in ('pending', 'executing', 'completed', 'failed', 'cancelled'));

create index if not exists ai_pending_actions_status_idx
  on public.ai_pending_actions (status, expires_at);

create or replace function public.claim_ai_pending_action(p_action_id uuid, p_payload_digest text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare action_row public.ai_pending_actions%rowtype;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'AI pending action requires a permanent account' using errcode = '42501';
  end if;
  select * into action_row from public.ai_pending_actions
  where id = p_action_id and user_id = auth.uid() and payload_digest = lower(p_payload_digest)
    and status in ('pending', 'failed') and consumed_at is null and expires_at > now() for update;
  if not found then raise exception 'AI pending action is expired, consumed, cancelled or inaccessible' using errcode = 'P0002'; end if;
  update public.ai_pending_actions set status = 'executing' where id = action_row.id;
  return jsonb_build_object('action_type', action_row.action_type, 'payload', action_row.payload);
end; $$;

create or replace function public.finalize_ai_pending_action(p_action_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  update public.ai_pending_actions set status = 'completed', consumed_at = now()
  where id = p_action_id and user_id = auth.uid() and status = 'executing' and consumed_at is null;
  if not found then raise exception 'AI pending action cannot be finalized' using errcode = 'P0002'; end if;
end; $$;

create or replace function public.fail_ai_pending_action(p_action_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  update public.ai_pending_actions set status = 'failed'
  where id = p_action_id and user_id = auth.uid() and status = 'executing' and consumed_at is null;
end; $$;

create or replace function public.cancel_ai_pending_action(p_action_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  update public.ai_pending_actions set status = 'cancelled'
  where id = p_action_id and user_id = auth.uid() and status = 'pending' and consumed_at is null;
  if not found then raise exception 'AI pending action cannot be cancelled' using errcode = 'P0002'; end if;
end; $$;

revoke all on function public.claim_ai_pending_action(uuid, text) from public, anon;
revoke all on function public.finalize_ai_pending_action(uuid) from public, anon;
revoke all on function public.fail_ai_pending_action(uuid) from public, anon;
revoke all on function public.cancel_ai_pending_action(uuid) from public, anon;
grant execute on function public.claim_ai_pending_action(uuid, text) to authenticated, service_role;
grant execute on function public.finalize_ai_pending_action(uuid) to authenticated, service_role;
grant execute on function public.fail_ai_pending_action(uuid) to authenticated, service_role;
grant execute on function public.cancel_ai_pending_action(uuid) to authenticated, service_role;

commit;
