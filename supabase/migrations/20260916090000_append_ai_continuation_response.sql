begin;

create or replace function public.append_ai_conversation_assistant_message(
  p_user_id uuid,
  p_conversation_id uuid,
  p_assistant_content text,
  p_state jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
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

  insert into public.ai_conversation_messages (conversation_id, role, content, metadata)
  values (p_conversation_id, 'assistant', left(trim(p_assistant_content), 12000), '{}'::jsonb);

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

revoke all on function public.append_ai_conversation_assistant_message(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.append_ai_conversation_assistant_message(uuid, uuid, text, jsonb) to service_role;

commit;
