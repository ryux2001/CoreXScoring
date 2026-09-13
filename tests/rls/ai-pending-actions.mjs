import { createClient } from "@supabase/supabase-js";

if (process.env.RUN_REMOTE_ACTION_TESTS !== "1" && process.env.RUN_LOCAL_SMOKES !== "1") {
  throw new Error("Define RUN_REMOTE_ACTION_TESTS=1 o RUN_LOCAL_SMOKES=1 para ejecutar la prueba de acciones pendientes.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !anonKey || !adminKey) throw new Error("Falta configuracion Supabase para las pruebas de acciones.");

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, adminKey, options);
const userClient = createClient(url, anonKey, options);
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const email = `corex-action-${runId}@example.com`;
const password = `Action-${runId}-Safe!`;
const digest = "a".repeat(64);
const payload = { title: "Remote action test", componentIds: { cpu: "test", gpu: "test", ram: "test" } };
const results = [];
let userId;

function record(name, ok, error) {
  results.push({ name, ok: Boolean(ok), errorCode: error?.code ?? error?.status ?? null });
}

async function createAction(client, suffix) {
  const response = await client.rpc("create_ai_pending_action_server", {
    p_request_id: crypto.randomUUID(),
    p_user_id: userId,
    p_action_type: "create_combo",
    p_payload: { ...payload, suffix },
    p_payload_digest: digest,
    p_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  return response;
}

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error || new Error("No se pudo crear usuario temporal.");
  userId = created.data.user.id;
  const signedIn = await userClient.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;

  const cancelled = await createAction(admin, "cancel");
  const cancelledId = cancelled.data;
  const cancel = await userClient.rpc("cancel_ai_pending_action", { p_action_id: cancelledId });
  const cancelledClaim = await userClient.rpc("claim_ai_pending_action", { p_action_id: cancelledId, p_payload_digest: digest });
  record("cancelled-action-cannot-be-claimed", !cancel.error && Boolean(cancelledClaim.error) && cancelledClaim.error.code === "P0002", cancel.error || cancelledClaim.error);

  const retryable = await createAction(admin, "retry");
  const retryableId = retryable.data;
  const claimed = await userClient.rpc("claim_ai_pending_action", { p_action_id: retryableId, p_payload_digest: digest });
  const failed = await userClient.rpc("fail_ai_pending_action", { p_action_id: retryableId });
  const retried = await userClient.rpc("claim_ai_pending_action", { p_action_id: retryableId, p_payload_digest: digest });
  record("failed-action-can-be-retried", !claimed.error && !failed.error && !retried.error, claimed.error || failed.error || retried.error);
  if (!retried.error) await userClient.rpc("fail_ai_pending_action", { p_action_id: retryableId });

  const concurrent = await createAction(admin, "concurrent");
  const concurrentId = concurrent.data;
  const attempts = await Promise.all([
    userClient.rpc("claim_ai_pending_action", { p_action_id: concurrentId, p_payload_digest: digest }),
    userClient.rpc("claim_ai_pending_action", { p_action_id: concurrentId, p_payload_digest: digest }),
  ]);
  record("concurrent-claim-allows-one-executor", attempts.filter((attempt) => !attempt.error).length === 1 && attempts.filter((attempt) => attempt.error?.code === "P0002").length === 1, attempts.find((attempt) => attempt.error)?.error);
  await userClient.rpc("fail_ai_pending_action", { p_action_id: concurrentId });

  const altered = await createAction(admin, "digest");
  const alteredClaim = await userClient.rpc("claim_ai_pending_action", { p_action_id: altered.data, p_payload_digest: "b".repeat(64) });
  record("altered-digest-is-rejected", Boolean(alteredClaim.error) && alteredClaim.error.code === "P0002", alteredClaim.error);
} finally {
  if (userId) {
    await admin.from("ai_pending_actions").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
    const remaining = await admin.from("ai_pending_actions").select("id", { count: "exact", head: true }).eq("user_id", userId);
    record("temporary-action-data-is-cleaned", !remaining.error && remaining.count === 0, remaining.error);
  }
  const failed = results.filter((result) => !result.ok);
  console.log(JSON.stringify({ passed: failed.length === 0, failed: failed.map((result) => result.name), results }));
  if (failed.length > 0) process.exitCode = 1;
}
