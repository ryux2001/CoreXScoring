import { createClient } from "@supabase/supabase-js";

if (process.env.RUN_LOCAL_SMOKES !== "1" && process.env.RUN_REMOTE_ABUSE_TESTS !== "1") {
  throw new Error("Define RUN_LOCAL_SMOKES=1 o RUN_REMOTE_ABUSE_TESTS=1 para probar los controles de abuso de IA.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !anonKey || !adminKey) throw new Error("Falta configuracion Supabase para los controles de abuso.");

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, adminKey, options);
const runId = crypto.randomUUID();
const email = `corex-abuse-${runId}@example.com`;
const password = `Abuse-${runId}-Safe!`;
const results = [];
let userId;
const leaseIds = [];
const actionIds = [];

function record(name, ok, error) {
  results.push({ name, ok: Boolean(ok), error: error?.code || error?.message || null });
}

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error || new Error("No se pudo crear usuario temporal.");
  userId = created.data.user.id;

  const first = await admin.rpc("acquire_ai_request_lease", {
    p_request_id: crypto.randomUUID(), p_user_id: userId, p_ip_hash: null, p_is_anonymous: false, p_scope: "ai",
  });
  const second = await admin.rpc("acquire_ai_request_lease", {
    p_request_id: crypto.randomUUID(), p_user_id: userId, p_ip_hash: null, p_is_anonymous: false, p_scope: "ai",
  });
  const third = await admin.rpc("acquire_ai_request_lease", {
    p_request_id: crypto.randomUUID(), p_user_id: userId, p_ip_hash: null, p_is_anonymous: false, p_scope: "ai",
  });
  if (first.data?.lease_id) leaseIds.push(first.data.lease_id);
  if (second.data?.lease_id) leaseIds.push(second.data.lease_id);
  record("user-concurrency-allows-two-and-denies-third", first.data?.allowed === true && second.data?.allowed === true && third.data?.allowed === false && third.data?.reason === "user_concurrency", third.error);

  const released = await admin.rpc("release_ai_request_lease", { p_lease_id: leaseIds[0] });
  const afterRelease = await admin.rpc("acquire_ai_request_lease", {
    p_request_id: crypto.randomUUID(), p_user_id: userId, p_ip_hash: null, p_is_anonymous: false, p_scope: "ai",
  });
  if (afterRelease.data?.lease_id) leaseIds.push(afterRelease.data.lease_id);
  record("released-lease-allows-next-request", !released.error && afterRelease.data?.allowed === true, released.error || afterRelease.error);

  for (const leaseId of leaseIds) await admin.rpc("release_ai_request_lease", { p_lease_id: leaseId });
  const anonymousFirst = await admin.rpc("acquire_ai_request_lease", {
    p_request_id: crypto.randomUUID(), p_user_id: userId, p_ip_hash: `ip-${runId}`, p_is_anonymous: true, p_scope: "ai",
  });
  const anonymousSecond = await admin.rpc("acquire_ai_request_lease", {
    p_request_id: crypto.randomUUID(), p_user_id: userId, p_ip_hash: `ip-${runId}`, p_is_anonymous: true, p_scope: "ai",
  });
  if (anonymousFirst.data?.lease_id) leaseIds.push(anonymousFirst.data.lease_id);
  record("anonymous-ip-concurrency-allows-one", anonymousFirst.data?.allowed === true && anonymousSecond.data?.allowed === false && anonymousSecond.data?.reason === "ip_concurrency", anonymousSecond.error);

  const circuitKey = `smoke-${runId}`;
  const initialCircuit = await admin.rpc("check_ai_provider_circuit", { p_provider: "openrouter", p_model: circuitKey });
  for (let index = 0; index < 5; index += 1) {
    await admin.rpc("record_ai_provider_failure", { p_provider: "openrouter", p_model: circuitKey, p_is_timeout: false });
  }
  const openCircuit = await admin.rpc("check_ai_provider_circuit", { p_provider: "openrouter", p_model: circuitKey });
  record("provider-circuit-opens-after-five-failures", initialCircuit.data?.allowed === true && openCircuit.data?.allowed === false, initialCircuit.error || openCircuit.error);

  const digest = "a".repeat(64);
  for (let index = 0; index < 5; index += 1) {
    const action = await admin.rpc("create_ai_pending_action_server", {
      p_request_id: crypto.randomUUID(),
      p_user_id: userId,
      p_action_type: "create_combo",
      p_payload: { title: `Action ${index}` },
      p_payload_digest: digest,
      p_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (action.error || !action.data) throw action.error || new Error("No se pudo crear accion de prueba.");
    actionIds.push(action.data);
  }
  const sixth = await admin.rpc("create_ai_pending_action_server", {
    p_request_id: crypto.randomUUID(),
    p_user_id: userId,
    p_action_type: "create_combo",
    p_payload: { title: "Action six" },
    p_payload_digest: digest,
    p_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  record("pending-actions-cap-at-five", sixth.error?.code === "P0001", sixth.error);
} finally {
  for (const leaseId of leaseIds) await admin.rpc("release_ai_request_lease", { p_lease_id: leaseId });
  if (userId) {
    await admin.from("ai_pending_actions").delete().eq("user_id", userId);
    await admin.from("ai_request_leases").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
  await admin.from("ai_provider_circuit_state").delete().eq("model", `smoke-${runId}`);
  const failed = results.filter((result) => !result.ok);
  console.log(JSON.stringify({ passed: failed.length === 0, failed: failed.map((result) => result.name), results }));
  if (failed.length > 0) process.exitCode = 1;
}
