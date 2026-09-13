import { createClient } from "@supabase/supabase-js";

if (process.env.RUN_REMOTE_API_RATE_LIMIT_TESTS !== "1") {
  throw new Error("Define RUN_REMOTE_API_RATE_LIMIT_TESTS=1 para ejecutar la prueba remota de rate limiting.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !anonKey || !adminKey) throw new Error("Falta configuración Supabase para la prueba de rate limiting.");

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, adminKey, options);
const anon = createClient(url, anonKey, options);
const key = `test-api-rate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const results = [];

function record(name, ok, error) {
  results.push({ name, ok: Boolean(ok), error: error?.message || null });
}

try {
  const calls = await Promise.all(Array.from({ length: 5 }, () => admin.rpc("consume_api_rate_limit", {
    p_key: key,
    p_window_seconds: 60,
    p_limit: 2,
  })));
  const successful = calls.filter((call) => call.data?.allowed === true).length;
  const blocked = calls.filter((call) => call.data?.allowed === false).length;
  record("atomic-limit-allows-only-two", successful === 2 && blocked === 3, calls.find((call) => call.error)?.error);

  const anonymous = await anon.rpc("consume_api_rate_limit", { p_key: `${key}-anon`, p_window_seconds: 60, p_limit: 2 });
  record("anonymous-cannot-call-rate-limit-rpc", anonymous.error?.code === "42501", anonymous.error);
} finally {
  await admin.from("api_rate_limit_buckets").delete().eq("bucket_key", key);
  await admin.from("api_rate_limit_buckets").delete().eq("bucket_key", `${key}-anon`);
  const failed = results.filter((result) => !result.ok);
  console.log(JSON.stringify({ passed: failed.length === 0, failed, results }));
  if (failed.length > 0) process.exitCode = 1;
}
