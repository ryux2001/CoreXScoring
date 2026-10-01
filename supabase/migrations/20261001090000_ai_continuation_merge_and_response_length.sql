begin;

alter table public.ai_conversation_messages
  drop constraint if exists ai_conversation_messages_content_check;

alter table public.ai_conversation_messages
  add constraint ai_conversation_messages_content_check
  check (char_length(content) >= 1 and char_length(content) <= 24000);

drop function if exists public.append_ai_conversation_assistant_message(uuid, uuid, text, jsonb);

create function public.append_ai_conversation_assistant_message(
  p_user_id uuid,
  p_conversation_id uuid,
  p_assistant_content text,
  p_state jsonb default '{}'::jsonb,
  p_merge_continuation boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_last_message_id bigint;
  v_last_role text;
  v_last_content text;
  v_overlap integer := 0;
  v_candidate_overlap integer;
begin
  if p_user_id is null
    or p_conversation_id is null
    or char_length(trim(coalesce(p_assistant_content, ''))) = 0 then
    raise exception 'ai_conversation_assistant_message_invalid' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.ai_conversations
    where id = p_conversation_id and user_id = p_user_id
  ) then
    raise exception 'ai_conversation_not_owned' using errcode = '42501';
  end if;

  if p_merge_continuation then
    select id, role, content into v_last_message_id, v_last_role, v_last_content
    from public.ai_conversation_messages
    where conversation_id = p_conversation_id
    order by id desc
    limit 1
    for update;
  end if;

  if p_merge_continuation and v_last_role = 'assistant' then
    for v_candidate_overlap in reverse least(char_length(v_last_content), char_length(trim(p_assistant_content)), 500)..8 loop
      if lower(right(v_last_content, v_candidate_overlap)) = lower(left(trim(p_assistant_content), v_candidate_overlap)) then
        v_overlap := v_candidate_overlap;
        exit;
      end if;
    end loop;
    update public.ai_conversation_messages
    set content = left(content || case when v_overlap > 0 then substring(trim(p_assistant_content) from v_overlap + 1) else E'\n' || trim(p_assistant_content) end, 24000)
    where id = v_last_message_id and conversation_id = p_conversation_id;
  else
    insert into public.ai_conversation_messages (conversation_id, role, content, metadata)
    values (p_conversation_id, 'assistant', left(trim(p_assistant_content), 24000), '{}'::jsonb);
  end if;

  update public.ai_conversations
  set state = coalesce(p_state, '{}'::jsonb),
      message_count = (select count(*) from public.ai_conversation_messages where conversation_id = p_conversation_id),
      updated_at = now(),
      last_message_at = now()
  where id = p_conversation_id and user_id = p_user_id;

  delete from public.ai_conversation_messages
  where conversation_id = p_conversation_id
    and id not in (
      select id from public.ai_conversation_messages
      where conversation_id = p_conversation_id
      order by id desc
      limit 150
    );

  update public.ai_conversations
  set message_count = (select count(*) from public.ai_conversation_messages where conversation_id = p_conversation_id)
  where id = p_conversation_id and user_id = p_user_id;
end;
$function$;

revoke all on function public.append_ai_conversation_assistant_message(uuid, uuid, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.append_ai_conversation_assistant_message(uuid, uuid, text, jsonb, boolean) to service_role;

commit;
