CREATE OR REPLACE FUNCTION public.create_ai_pending_action_server (
  p_user_id        uuid,
  p_action_type    text,
  p_payload        jsonb,
  p_payload_digest text,
  p_expires_at     timestamp with time zone
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'AI pending action user is required' USING errcode = '22023';
  END IF;

  IF p_action_type NOT IN ('create_combo', 'create_build', 'set_custom_price')
    OR p_payload IS NULL
    OR p_payload_digest !~ '^[a-f0-9]{64}$'
    OR p_expires_at <= now()
    OR p_expires_at > now() + interval '15 minutes' THEN
    RAISE EXCEPTION 'AI pending action is invalid' USING errcode = '22023';
  END IF;

  INSERT INTO public.ai_pending_actions (
    user_id, action_type, payload, payload_digest, expires_at
  ) VALUES (
    p_user_id, p_action_type, p_payload, lower(p_payload_digest), p_expires_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_ai_pending_action (text, jsonb, text, timestamp with time zone) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_ai_pending_action_server (uuid, text, jsonb, text, timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_ai_pending_action_server (uuid, text, jsonb, text, timestamp with time zone) TO service_role;
