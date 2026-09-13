import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

if (process.env.RUN_REMOTE_CHAT_SMOKE !== "1") {
  throw new Error("Define RUN_REMOTE_CHAT_SMOKE=1 para ejecutar el smoke test remoto de chat.");
}

const appUrl = process.env.AI_CHAT_SMOKE_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !anonKey || !adminKey) throw new Error("Falta configuracion Supabase para el smoke test de chat.");

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(supabaseUrl, adminKey, options);
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const email = `corex-chat-${runId}@example.com`;
const password = `Chat-${runId}-Safe!`;
const results = [];
const userIds = [];

function record(name, ok, error) {
  results.push({ name, ok: Boolean(ok), error: error?.message || null });
}

async function createCookieSession(signIn) {
  const cookies = new Map();
  const client = createServerClient(supabaseUrl, anonKey, {
    auth: { storageKey: "sb-auth-token" },
    cookies: {
      getAll: () => [],
      setAll: (items) => items.forEach((item) => cookies.set(item.name, item.value)),
    },
  });
  const response = await signIn(client);
  if (response.error || !response.data.user) throw response.error || new Error("No se pudo crear la sesion temporal.");
  userIds.push(response.data.user.id);
  return { userId: response.data.user.id, cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; ") };
}

async function chat(cookie) {
  return fetch(`${appUrl}/api/ai/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: appUrl,
      cookie,
    },
    body: JSON.stringify({ messages: [{ role: "user", content: "Resume en una frase la diferencia entre CPU y GPU." }] }),
  });
}

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error || new Error("No se pudo crear usuario temporal.");

  const registered = await createCookieSession((client) => client.auth.signInWithPassword({ email, password }));
  const anonymous = await createCookieSession((client) => client.auth.signInAnonymously());

  const registeredResponse = await chat(registered.cookie);
  const registeredBody = await registeredResponse.json();
  record("registered-user-can-chat-with-local-provider", registeredResponse.ok && registeredBody.provider === "local" && typeof registeredBody.message?.content === "string" && registeredBody.message.content.length > 20, registeredResponse.ok ? null : new Error(String(registeredBody.error)));

  const anonymousResponse = await chat(anonymous.cookie);
  const anonymousBody = await anonymousResponse.json();
  record("anonymous-user-can-chat-with-local-provider", anonymousResponse.ok && anonymousBody.provider === "local" && typeof anonymousBody.message?.content === "string" && anonymousBody.message.content.length > 20, anonymousResponse.ok ? null : new Error(String(anonymousBody.error)));

  const quotaConfig = await admin.from("ai_quota_config").select("authenticated_daily_messages").eq("singleton", true).single();
  const usageDate = new Date().toISOString().slice(0, 10);
  const seededUsage = await admin.from("ai_usage_daily").upsert({
    usage_date: usageDate,
    bucket_scope: "user",
    bucket_key: registered.userId,
    user_id: registered.userId,
    is_anonymous: false,
    messages_used: quotaConfig.data?.authenticated_daily_messages ?? 1,
    reserved_tokens: 0,
  });
  const limitedResponse = await chat(registered.cookie);
  record("chat-route-returns-429-after-user-quota", !quotaConfig.error && !seededUsage.error && limitedResponse.status === 429, limitedResponse.status === 429 ? null : new Error(`HTTP ${limitedResponse.status}`));
} finally {
  for (const userId of userIds) {
    await admin.from("ai_quota_reservations").delete().eq("user_id", userId);
    await admin.from("ai_usage_daily").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
  const [reservations, usage] = await Promise.all([
    admin.from("ai_quota_reservations").select("id", { count: "exact", head: true }).in("user_id", userIds),
    admin.from("ai_usage_daily").select("user_id", { count: "exact", head: true }).in("user_id", userIds),
  ]);
  record("temporary-chat-data-is-cleaned", !reservations.error && !usage.error && reservations.count === 0 && usage.count === 0, reservations.error || usage.error);
  const failed = results.filter((result) => !result.ok);
  console.log(JSON.stringify({ passed: failed.length === 0, failed: failed.map((result) => result.name), results }));
  if (failed.length > 0) process.exitCode = 1;
}
