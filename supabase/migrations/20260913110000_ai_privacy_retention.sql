CREATE TABLE IF NOT EXISTS public.ai_external_provider_consents (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  policy_version text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_external_provider_consents_pkey PRIMARY KEY (user_id, provider, policy_version),
  CONSTRAINT ai_external_provider_consents_provider_check CHECK (provider = ANY (ARRAY['groq'::text, 'cerebras'::text, 'openrouter'::text]))
);

ALTER TABLE public.ai_external_provider_consents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_external_provider_consents FROM anon, authenticated;
GRANT ALL ON TABLE public.ai_external_provider_consents TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_ai_conversations_job()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted bigint;
BEGIN
  DELETE FROM public.ai_conversations
  WHERE last_message_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'retention_days', 90,
    'deleted_conversations', v_deleted
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_ai_conversations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'AI conversation cleanup access denied' USING errcode = '42501';
  END IF;

  RETURN public.cleanup_ai_conversations_job();
END;
$function$;

REVOKE ALL ON FUNCTION public.cleanup_ai_conversations_job() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_ai_conversations_job() TO postgres, service_role;
REVOKE ALL ON FUNCTION public.cleanup_ai_conversations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_ai_conversations() TO authenticated, postgres, service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $schedule$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'corex-ai-conversation-retention';

  PERFORM cron.schedule(
    'corex-ai-conversation-retention',
    '0 3 * * *',
    'SELECT public.cleanup_ai_conversations_job();'
  );
END;
$schedule$;
