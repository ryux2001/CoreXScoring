begin;

alter table public.user_ai_chat_settings
  add column if not exists cerebras_api_key_ciphertext text,
  add column if not exists cerebras_key_hint text;

alter table public.user_ai_chat_settings
  drop constraint if exists user_ai_chat_settings_preferred_provider_check;

alter table public.user_ai_chat_settings
  add constraint user_ai_chat_settings_preferred_provider_check
  check (preferred_provider in ('groq', 'cerebras', 'openrouter'));

commit;
