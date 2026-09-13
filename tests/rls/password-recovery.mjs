import { createClient } from "@supabase/supabase-js";

if (process.env.RUN_REMOTE_PASSWORD_RECOVERY_TESTS !== "1" && process.env.RUN_LOCAL_SMOKES !== "1") {
  throw new Error("Define RUN_REMOTE_PASSWORD_RECOVERY_TESTS=1 o RUN_LOCAL_SMOKES=1 para ejecutar la prueba de recovery.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !anonKey || !adminKey) throw new Error("Falta configuración Supabase para la prueba de recovery.");

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, adminKey, options);
const anon = createClient(url, anonKey, options);
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const email = `corex-recovery-${runId}@example.com`;
const results = [];
let userId;
let tokenHash;

function record(name, ok, error) {
  results.push({ name, ok: Boolean(ok), error: error?.message || null });
}

try {
  const created = await admin.auth.admin.createUser({
    email,
    password: `Recovery-${runId}-Safe!`,
    email_confirm: true,
  });
  if (created.error || !created.data.user) throw created.error || new Error("No se pudo crear usuario temporal.");
  userId = created.data.user.id;

  tokenHash = `test-${runId}`;
  const inserted = await admin.from("auth_recovery_proofs").insert({
    token_hash: tokenHash,
    user_id: userId,
    expires_at: new Date(Date.now() + 600_000).toISOString(),
  });
  record("service-role-can-create-recovery-proof", !inserted.error, inserted.error);

  const anonymousRead = await anon
    .from("auth_recovery_proofs")
    .select("token_hash")
    .eq("token_hash", tokenHash);
  record(
    "anonymous-cannot-read-recovery-proof",
    !anonymousRead.error ? anonymousRead.data?.length === 0 : anonymousRead.error.code === "42501",
    anonymousRead.error,
  );
} finally {
  if (tokenHash) await admin.from("auth_recovery_proofs").delete().eq("token_hash", tokenHash);
  if (userId) await admin.auth.admin.deleteUser(userId);
}

console.log(JSON.stringify({ passed: results.every((result) => result.ok), failed: results.filter((result) => !result.ok), results }));
if (results.some((result) => !result.ok)) process.exit(1);
