import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

if (process.env.RUN_REMOTE_ACTION_API_SMOKE !== "1") throw new Error("Define RUN_REMOTE_ACTION_API_SMOKE=1 para probar el endpoint de cancelacion.");
const appUrl = process.env.AI_CHAT_SMOKE_URL || "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !anonKey || !adminKey) throw new Error("Falta configuracion Supabase para el smoke test de cancelacion.");

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, adminKey, options);
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const email = `corex-action-api-${runId}@example.com`;
const password = `ActionApi-${runId}-Safe!`;
const digest = "a".repeat(64);
const results = [];
let userId;

function record(name, ok, error) { results.push({ name, ok: Boolean(ok), error: error?.message || null }); }

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
  const action = await sessionClient.rpc("create_ai_pending_action", {
    p_action_type: "create_combo",
    p_payload: { title: "API cancellation test" },
    p_payload_digest: digest,
    p_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (action.error || !action.data) throw action.error || new Error("No se pudo crear la accion temporal.");

  const response = await fetch(`${appUrl}/api/ai/action/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: appUrl, cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; ") },
    body: JSON.stringify({ actionId: action.data }),
  });
  const claim = await sessionClient.rpc("claim_ai_pending_action", { p_action_id: action.data, p_payload_digest: digest });
  record("cancel-endpoint-revokes-action", response.ok && claim.error?.code === "P0002", response.ok ? claim.error : new Error(`HTTP ${response.status}`));
} finally {
  if (userId) {
    await admin.from("ai_pending_actions").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
  const failed = results.filter((result) => !result.ok);
  console.log(JSON.stringify({ passed: failed.length === 0, failed: failed.map((result) => result.name), results }));
  if (failed.length > 0) process.exitCode = 1;
}
