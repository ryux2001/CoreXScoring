import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

if (process.env.RUN_REMOTE_AI_PRIVACY_SMOKE !== "1" && process.env.RUN_LOCAL_SMOKES !== "1") {
  throw new Error("Define RUN_REMOTE_AI_PRIVACY_SMOKE=1 o RUN_LOCAL_SMOKES=1 para ejecutar el smoke de privacidad.");
}

const appUrl = process.env.AI_PRIVACY_SMOKE_URL || "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !anonKey || !adminKey) throw new Error("Falta configuración Supabase para el smoke de privacidad.");

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, adminKey, options);
const runId = crypto.randomUUID();
const email = `corex-privacy-${runId}@example.com`;
const password = `Privacy-${runId}-Safe!`;
const results = [];
let userId;
let consentProvider;
let oldConversationId;

function record(name, ok, error) {
  results.push({ name, ok: Boolean(ok), error: error?.message || null });
}

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error || new Error("No se pudo crear usuario temporal.");
  userId = created.data.user.id;

  const cookies = new Map();
  const sessionClient = createServerClient(url, anonKey, {
    auth: { storageKey: "sb-auth-token" },
    cookies: { getAll: () => [], setAll: (items) => items.forEach((item) => cookies.set(item.name, item.value)) },
  });
  const signedIn = await sessionClient.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  const cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  const headers = { "content-type": "application/json", origin: appUrl, cookie };

  const blocked = await fetch(`${appUrl}/api/ai/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages: [{ role: "user", content: "Dime qué puedes hacer." }] }),
  });
  const blockedPayload = await blocked.json();
  consentProvider = blockedPayload.providers?.[0];
  record("external-chat-requires-consent", blocked.status === 428 && blockedPayload.code === "external_provider_consent_required" && Boolean(consentProvider), blocked.status === 428 ? null : new Error(`HTTP ${blocked.status}: ${JSON.stringify(blockedPayload)}`));

  if (consentProvider) {
    const consentResponse = await fetch(`${appUrl}/api/ai/provider-consent`, {
      method: "POST",
      headers,
      body: JSON.stringify({ provider: consentProvider }),
    });
    const consentPayload = await consentResponse.json();
    const stored = await admin.from("ai_external_provider_consents").select("provider,policy_version").eq("user_id", userId).eq("provider", consentProvider).maybeSingle();
    record("provider-consent-is-stored", consentResponse.ok && consentPayload.ok === true && Boolean(stored.data), consentResponse.ok ? stored.error : new Error(`HTTP ${consentResponse.status}`));
  }

  const seeded = await admin.from("ai_conversations").insert({
    user_id: userId,
    title: "Temporary retention test",
    last_message_at: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString(),
  }).select("id").single();
  if (seeded.error || !seeded.data) throw seeded.error || new Error("No se pudo crear conversación temporal.");
  oldConversationId = seeded.data.id;
  const message = await admin.from("ai_conversation_messages").insert({ conversation_id: oldConversationId, role: "user", content: "temporary" });
  if (message.error) throw message.error;

  const cleanup = await admin.rpc("cleanup_ai_conversations_job");
  const remaining = await admin.from("ai_conversations").select("id").eq("id", oldConversationId);
  const remainingMessages = await admin.from("ai_conversation_messages").select("id").eq("conversation_id", oldConversationId);
  record("retention-job-deletes-old-conversations", !cleanup.error && remaining.data?.length === 0 && remainingMessages.data?.length === 0, cleanup.error || remaining.error || remainingMessages.error);
} finally {
  if (oldConversationId) await admin.from("ai_conversations").delete().eq("id", oldConversationId);
  if (userId) {
    await admin.from("ai_external_provider_consents").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
  const failed = results.filter((result) => !result.ok);
  console.log(JSON.stringify({ passed: failed.length === 0, failed, results }));
  if (failed.length > 0) process.exitCode = 1;
}
