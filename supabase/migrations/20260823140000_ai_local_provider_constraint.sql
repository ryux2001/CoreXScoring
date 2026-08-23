-- CoreX AI: permite registrar la inferencia local de llama.cpp.
-- Es una migración correctiva para entornos que ya aplicaron las migraciones
-- iniciales de telemetría antes de habilitar el proveedor local.

alter table public.ai_action_logs
  drop constraint if exists ai_action_logs_provider_check;

alter table public.ai_action_logs
  add constraint ai_action_logs_provider_check
  check (provider in ('local', 'groq', 'cerebras', 'openrouter', 'guardrail'));
