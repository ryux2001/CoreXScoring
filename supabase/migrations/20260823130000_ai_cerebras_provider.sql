-- CoreX AI: permite registrar Cerebras como proveedor de respaldo.
-- No modifica conversaciones, cuotas ni registros de producto existentes.

alter table public.ai_action_logs
  drop constraint if exists ai_action_logs_provider_check;

alter table public.ai_action_logs
  add constraint ai_action_logs_provider_check
  check (provider in ('local', 'groq', 'cerebras', 'openrouter', 'guardrail'));
