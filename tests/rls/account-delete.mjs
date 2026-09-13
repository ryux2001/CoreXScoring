import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

if (process.env.RUN_REMOTE_ACCOUNT_DELETE_TESTS !== "1" && process.env.RUN_LOCAL_SMOKES !== "1") {
  throw new Error("Define RUN_REMOTE_ACCOUNT_DELETE_TESTS=1 o RUN_LOCAL_SMOKES=1 para ejecutar la prueba de borrado.");
}

const appUrl = process.env.ACCOUNT_DELETE_SMOKE_URL || "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !anonKey || !adminKey) throw new Error("Falta configuración Supabase para la prueba de borrado.");

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, adminKey, options);
const runId = crypto.randomUUID();
const email = `corex-delete-${runId}@example.com`;
const password = `Delete-${runId}-Safe!`;
const results = [];
let userId;

function record(name, ok, error) {
  results.push({ name, ok: Boolean(ok), error: error?.message || null });
}

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error || new Error("No se pudo crear usuario temporal.");
  userId = created.data.user.id;

  const seeded = await admin.from("ai_conversations").insert({ user_id: userId, title: "Temporary deletion test" });
  if (seeded.error) throw seeded.error;
  const recoverySeed = await admin.from("auth_recovery_proofs").insert({
    token_hash: `delete-test-${runId}`,
    user_id: userId,
    expires_at: new Date(Date.now() + 600_000).toISOString(),
  });
  if (recoverySeed.error) throw recoverySeed.error;

  const cookies = new Map();
  const sessionClient = createServerClient(url, anonKey, {
    auth: { storageKey: "sb-auth-token" },
    cookies: { getAll: () => [], setAll: (items) => items.forEach((item) => cookies.set(item.name, item.value)) },
  });
  const signedIn = await sessionClient.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;

  const baseHeaders = { "content-type": "application/json", origin: appUrl, cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; ") };
  const wrongPassword = await fetch(`${appUrl}/api/account/delete`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ confirmation: "ELIMINAR", password: "wrong-password" }),
  });
  const stillExists = await admin.auth.admin.getUserById(userId);
  record("wrong-password-does-not-delete", wrongPassword.status === 401 && Boolean(stillExists.data.user), wrongPassword.status === 401 ? null : new Error(`HTTP ${wrongPassword.status}`));

  const validDelete = await fetch(`${appUrl}/api/account/delete`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ confirmation: "ELIMINAR", password }),
  });
  const deleted = await admin.auth.admin.getUserById(userId);
  record("correct-password-deletes-account", validDelete.ok && !deleted.data.user, validDelete.ok && !deleted.data.user ? null : deleted.error || new Error(`HTTP ${validDelete.status}`));

  const conversations = await admin.from("ai_conversations").select("id").eq("user_id", userId);
  const recoveryProofs = await admin.from("auth_recovery_proofs").select("token_hash").eq("user_id", userId);
  record("related-private-data-is-cascaded", conversations.data?.length === 0 && recoveryProofs.data?.length === 0, conversations.error || recoveryProofs.error);
} finally {
  if (userId) {
    await admin.from("auth_recovery_proofs").delete().eq("user_id", userId);
    await admin.from("ai_conversations").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
  const failed = results.filter((result) => !result.ok);
  console.log(JSON.stringify({ passed: failed.length === 0, failed, results }));
  if (failed.length > 0) process.exitCode = 1;
}
