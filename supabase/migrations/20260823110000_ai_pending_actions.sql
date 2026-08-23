-- CoreX AI Fase 5: propuestas de escritura de corta duración y de un solo uso.

create table if not exists public.ai_pending_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null check (action_type in ('create_combo', 'create_build', 'set_custom_price')),
  payload jsonb not null,
  payload_digest text not null check (payload_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  check (expires_at > created_at)
);

create index if not exists ai_pending_actions_user_created_idx
  on public.ai_pending_actions (user_id, created_at desc);

create index if not exists ai_pending_actions_expiry_idx
  on public.ai_pending_actions (expires_at)
  where consumed_at is null;

alter table public.ai_pending_actions enable row level security;
revoke all on table public.ai_pending_actions from anon, authenticated;

create or replace function public.create_ai_pending_action(
  p_action_type text,
  p_payload jsonb,
  p_payload_digest text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'AI pending action requires a permanent account' using errcode = '42501';
  end if;

  if p_action_type not in ('create_combo', 'create_build', 'set_custom_price')
    or p_payload_digest !~ '^[a-f0-9]{64}$'
    or p_expires_at <= now()
    or p_expires_at > now() + interval '15 minutes' then
    raise exception 'AI pending action is invalid' using errcode = '22023';
  end if;

  insert into public.ai_pending_actions (
    user_id, action_type, payload, payload_digest, expires_at
  ) values (
    auth.uid(), p_action_type, p_payload, lower(p_payload_digest), p_expires_at
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.consume_ai_pending_action(
  p_action_id uuid,
  p_payload_digest text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action public.ai_pending_actions%rowtype;
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'AI pending action requires a permanent account' using errcode = '42501';
  end if;

  select * into v_action
  from public.ai_pending_actions
  where id = p_action_id
    and user_id = auth.uid()
    and consumed_at is null
    and expires_at > now()
    and payload_digest = lower(p_payload_digest)
  for update;

  if not found then
    raise exception 'AI pending action is expired, consumed or inaccessible' using errcode = 'P0002';
  end if;

  update public.ai_pending_actions
  set consumed_at = now()
  where id = v_action.id;

  return jsonb_build_object(
    'action_type', v_action.action_type,
    'payload', v_action.payload
  );
end;
$$;

revoke all on function public.create_ai_pending_action(text, jsonb, text, timestamptz) from public, anon;
revoke all on function public.consume_ai_pending_action(uuid, text) from public, anon;
grant execute on function public.create_ai_pending_action(text, jsonb, text, timestamptz) to authenticated;
grant execute on function public.consume_ai_pending_action(uuid, text) to authenticated;
