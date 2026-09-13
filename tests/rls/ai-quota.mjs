import { createClient } from "@supabase/supabase-js";

if (process.env.RUN_REMOTE_QUOTA_TESTS !== "1") {
  throw new Error("Define RUN_REMOTE_QUOTA_TESTS=1 para ejecutar pruebas remotas de cuotas que crean y eliminan datos temporales.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !anonKey || !adminKey) throw new Error("Falta configuracion Supabase para las pruebas de cuotas.");

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, adminKey, options);
const userClient = createClient(url, anonKey, options);
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const email = `corex-quota-${runId}@example.com`;
const password = `Quota-${runId}-Safe!`;
const results = [];
let userId;

function record(name, ok, error) {
  results.push({ name, ok: Boolean(ok), errorCode: error?.code ?? error?.status ?? null });
}

async function reserve(requestId, tokens = 100) {
  return admin.rpc("reserve_ai_quota", {
    p_request_id: requestId,
    p_user_id: userId,
    p_ip_hash: `quota-test-${runId}`,
    p_is_anonymous: false,
    p_reserved_tokens: tokens,
  });
}

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error || new Error("No se pudo crear usuario temporal.");
  userId = created.data.user.id;
  const signedIn = await userClient.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;

  const directLegacyReserve = await userClient.rpc("consume_ai_quota", {
    p_user_id: userId, p_ip_hash: "forged", p_is_anonymous: false, p_reserved_tokens: 0,
  });
  const directLegacySettlement = await userClient.rpc("settle_ai_quota", {
    p_user_id: userId, p_ip_hash: "forged", p_reserved_tokens: 20000, p_actual_tokens: 0,
  });
  const directNewReserve = await userClient.rpc("reserve_ai_quota", {
    p_request_id: crypto.randomUUID(), p_user_id: userId, p_ip_hash: "forged", p_is_anonymous: false, p_reserved_tokens: 0,
  });
  const directNewSettlement = await userClient.rpc("settle_ai_quota_reservation", {
    p_reservation_id: crypto.randomUUID(), p_actual_tokens: 0,
  });
  record("authenticated-jwt-cannot-invoke-internal-quota-rpcs", Boolean(directLegacyReserve.error) && Boolean(directLegacySettlement.error) && Boolean(directNewReserve.error) && Boolean(directNewSettlement.error), directLegacyReserve.error || directLegacySettlement.error || directNewReserve.error || directNewSettlement.error);

  const first = await reserve(crypto.randomUUID());
  const reservationId = first.data?.reservation_id;
  record("service-role-can-create-quota-reservation", !first.error && typeof reservationId === "string", first.error);

  if (reservationId) {
    const firstSettlement = await admin.rpc("settle_ai_quota_reservation", { p_reservation_id: reservationId, p_actual_tokens: 25 });
    const replay = await admin.rpc("settle_ai_quota_reservation", { p_reservation_id: reservationId, p_actual_tokens: 0 });
    const reservation = await admin.from("ai_quota_reservations").select("state,reserved_tokens,actual_tokens").eq("id", reservationId).maybeSingle();
    record("quota-reservation-settles-exactly-once", !firstSettlement.error && Boolean(replay.error) && reservation.data?.state === "settled" && reservation.data?.reserved_tokens === 100 && reservation.data?.actual_tokens === 25, firstSettlement.error || replay.error || reservation.error);
  }

  const concurrent = await reserve(crypto.randomUUID());
  const concurrentId = concurrent.data?.reservation_id;
  if (concurrentId) {
    const attempts = await Promise.all([
      admin.rpc("settle_ai_quota_reservation", { p_reservation_id: concurrentId, p_actual_tokens: 40 }),
      admin.rpc("settle_ai_quota_reservation", { p_reservation_id: concurrentId, p_actual_tokens: 40 }),
    ]);
    const reservation = await admin.from("ai_quota_reservations").select("state,actual_tokens").eq("id", concurrentId).maybeSingle();
    record("concurrent-settlement-applies-once", attempts.filter((attempt) => !attempt.error).length === 1 && attempts.filter((attempt) => attempt.error).length === 1 && reservation.data?.state === "settled" && reservation.data?.actual_tokens === 40, attempts.find((attempt) => attempt.error)?.error || reservation.error);
  } else {
    record("concurrent-settlement-applies-once", false, concurrent.error);
  }

  const quotaConfig = await admin.from("ai_quota_config").select("authenticated_daily_tokens").eq("singleton", true).single();
  const tokenLimit = quotaConfig.data?.authenticated_daily_tokens;
  if (typeof tokenLimit === "number" && tokenLimit >= 1) {
    const usageDate = new Date().toISOString().slice(0, 10);
    const seededUsage = await admin.from("ai_usage_daily").upsert({
      usage_date: usageDate,
      bucket_scope: "user",
      bucket_key: userId,
      user_id: userId,
      is_anonymous: false,
      messages_used: 0,
      reserved_tokens: tokenLimit - 1,
    });
    const nearLimit = await Promise.all([reserve(crypto.randomUUID(), 1), reserve(crypto.randomUUID(), 1)]);
    record("concurrent-reservations-cannot-exceed-user-token-limit", !seededUsage.error && nearLimit.filter((attempt) => attempt.data?.allowed === true).length === 1 && nearLimit.filter((attempt) => attempt.data?.allowed === false).length === 1, seededUsage.error || quotaConfig.error || nearLimit.find((attempt) => attempt.error)?.error);
  } else {
    record("concurrent-reservations-cannot-exceed-user-token-limit", false, quotaConfig.error);
  }
} finally {
  if (userId) {
    await admin.from("ai_quota_reservations").delete().eq("user_id", userId);
    await admin.from("ai_usage_daily").delete().eq("user_id", userId);
    await admin.from("ai_usage_daily").delete().eq("bucket_scope", "ip").like("bucket_key", `quota-test-${runId}`);
    await admin.auth.admin.deleteUser(userId);
    const [reservations, userUsage, ipUsage] = await Promise.all([
      admin.from("ai_quota_reservations").select("id", { count: "exact", head: true }).eq("user_id", userId),
      admin.from("ai_usage_daily").select("user_id", { count: "exact", head: true }).eq("user_id", userId),
      admin.from("ai_usage_daily").select("bucket_key", { count: "exact", head: true }).eq("bucket_scope", "ip").like("bucket_key", `quota-test-${runId}`),
    ]);
    record("temporary-quota-data-is-cleaned", [reservations, userUsage, ipUsage].every((response) => !response.error && response.count === 0), reservations.error || userUsage.error || ipUsage.error);
  }
  const failed = results.filter((result) => !result.ok);
  console.log(JSON.stringify({ passed: failed.length === 0, failed: failed.map((result) => result.name), results }));
  if (failed.length > 0) process.exitCode = 1;
}
