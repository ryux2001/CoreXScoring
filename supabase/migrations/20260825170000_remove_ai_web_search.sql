-- Retira la búsqueda externa de precios y sus credenciales sin afectar el
-- gateway de chat ni las credenciales BYOK de Groq/OpenRouter.

drop function if exists public.consume_ai_web_search_quota(uuid, text, boolean, integer);
drop function if exists public.set_user_ai_web_search_settings_updated_at();
drop table if exists public.user_ai_web_search_settings;

alter table public.ai_quota_config
  drop column if exists anonymous_daily_web_searches,
  drop column if exists authenticated_daily_web_searches,
  drop column if exists anonymous_ip_daily_web_searches,
  drop column if exists authenticated_ip_daily_web_searches;

alter table public.ai_usage_daily
  drop column if exists web_searches_used;

update public.ai_conversation_messages
set metadata = metadata - 'webSearch'
where metadata ? 'webSearch';
