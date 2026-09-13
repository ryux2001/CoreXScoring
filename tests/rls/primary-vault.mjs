import { createClient } from "@supabase/supabase-js";

if (process.env.RUN_REMOTE_RLS_TESTS !== "1" && process.env.RUN_LOCAL_SMOKES !== "1") {
  throw new Error("Define RUN_REMOTE_RLS_TESTS=1 o RUN_LOCAL_SMOKES=1 para ejecutar la prueba RLS.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !anonKey || !adminKey) throw new Error("Falta configuracion Supabase para las pruebas RLS.");

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, adminKey, options);
const createUserClient = () => createClient(url, anonKey, options);
const results = [];
const createdUsers = [];
let runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const password = `Rls-${runId}-Safe!`;

function record(name, ok, error) {
  results.push({ name, ok: Boolean(ok), errorCode: error?.code ?? error?.status ?? null });
}

async function createUser(label) {
  const email = `corex-rls-${runId}-${label}@example.com`;
  const response = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (response.error || !response.data.user) throw response.error || new Error(`No se pudo crear ${label}`);
  createdUsers.push(response.data.user.id);
  const client = createUserClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { id: response.data.user.id, client };
}

async function cleanup() {
  for (const userId of createdUsers) {
    await admin.from("saved_products").delete().eq("user_id", userId);
    await admin.from("saved_combos").delete().eq("user_id", userId);
    await admin.from("saved_builds").delete().eq("user_id", userId);
    await admin.from("created_combos").delete().eq("user_id", userId);
    await admin.from("created_builds").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }

  const [savedProducts, savedCombos, savedBuilds, createdCombos, createdBuilds] = await Promise.all([
    admin.from("saved_products").select("user_id", { count: "exact", head: true }).in("user_id", createdUsers),
    admin.from("saved_combos").select("user_id", { count: "exact", head: true }).in("user_id", createdUsers),
    admin.from("saved_builds").select("user_id", { count: "exact", head: true }).in("user_id", createdUsers),
    admin.from("created_combos").select("user_id", { count: "exact", head: true }).in("user_id", createdUsers),
    admin.from("created_builds").select("user_id", { count: "exact", head: true }).in("user_id", createdUsers),
  ]);
  const responses = [savedProducts, savedCombos, savedBuilds, createdCombos, createdBuilds];
  record("temporary-vault-data-is-cleaned", responses.every((response) => !response.error && response.count === 0), responses.find((response) => response.error)?.error);
}

try {
  const [products, catalogCombo, catalogBuild] = await Promise.all([
    admin.from("products").select("id,type").in("type", ["cpu", "gpu", "ram", "motherboard", "storage", "psu"]),
    admin.from("combos").select("id").limit(1).maybeSingle(),
    admin.from("builds").select("id").limit(1).maybeSingle(),
  ]);
  if (products.error || catalogCombo.error || catalogBuild.error) throw products.error || catalogCombo.error || catalogBuild.error;
  const byType = new Map((products.data ?? []).map((product) => [product.type, product.id]));
  const cpuId = byType.get("cpu");
  const gpuId = byType.get("gpu");
  const ramId = byType.get("ram");
  const motherboardId = byType.get("motherboard");
  const storageId = byType.get("storage");
  const psuId = byType.get("psu");
  if (!cpuId || !gpuId || !ramId || !motherboardId || !storageId || !psuId || !catalogCombo.data?.id || !catalogBuild.data?.id) {
    throw new Error("Faltan referencias de catálogo para la prueba RLS.");
  }

  const userA = await createUser("a");
  const userB = await createUser("b");
  const anonymous = createUserClient();
  const anonymousAuth = await anonymous.auth.signInAnonymously();
  if (anonymousAuth.error || !anonymousAuth.data.user) throw anonymousAuth.error || new Error("No se pudo crear sesion anonima.");
  createdUsers.push(anonymousAuth.data.user.id);

  const savedInsert = await userA.client.from("saved_products").insert({ user_id: userA.id, product_id: cpuId });
  record("registered-user-can-save-own-product", !savedInsert.error, savedInsert.error);

  const foreignRead = await userB.client.from("saved_products").select("user_id").eq("user_id", userA.id).eq("product_id", cpuId);
  record("other-user-cannot-read-saved-product", (foreignRead.data ?? []).length === 0, foreignRead.error);

  const foreignInsert = await userB.client.from("saved_products").insert({ user_id: userA.id, product_id: gpuId });
  const spoofedRow = await admin.from("saved_products").select("user_id").eq("user_id", userA.id).eq("product_id", gpuId);
  record("other-user-cannot-save-for-owner", Boolean(foreignInsert.error) && (spoofedRow.data ?? []).length === 0, foreignInsert.error);

  const anonymousInsert = await anonymous.from("saved_products").insert({ user_id: anonymousAuth.data.user.id, product_id: cpuId });
  const anonymousRow = await admin.from("saved_products").select("user_id").eq("user_id", anonymousAuth.data.user.id).eq("product_id", cpuId);
  record("anonymous-user-cannot-save-product", Boolean(anonymousInsert.error) && (anonymousRow.data ?? []).length === 0, anonymousInsert.error);

  const savedCombo = await userA.client.from("saved_combos").insert({ user_id: userA.id, combo_id: catalogCombo.data.id });
  const foreignSavedCombo = await userB.client.from("saved_combos").insert({ user_id: userA.id, combo_id: catalogCombo.data.id });
  const anonymousSavedCombo = await anonymous.from("saved_combos").insert({ user_id: anonymousAuth.data.user.id, combo_id: catalogCombo.data.id });
  const foreignComboRead = await userB.client.from("saved_combos").select("user_id").eq("user_id", userA.id);
  record("registered-user-can-save-own-combo", !savedCombo.error, savedCombo.error);
  record("other-user-cannot-save-or-read-saved-combo", Boolean(foreignSavedCombo.error) && (foreignComboRead.data ?? []).length === 0, foreignSavedCombo.error || foreignComboRead.error);
  record("anonymous-user-cannot-save-combo", Boolean(anonymousSavedCombo.error), anonymousSavedCombo.error);

  const savedBuild = await userA.client.from("saved_builds").insert({ user_id: userA.id, build_id: catalogBuild.data.id });
  const foreignSavedBuild = await userB.client.from("saved_builds").insert({ user_id: userA.id, build_id: catalogBuild.data.id });
  const anonymousSavedBuild = await anonymous.from("saved_builds").insert({ user_id: anonymousAuth.data.user.id, build_id: catalogBuild.data.id });
  const foreignBuildRead = await userB.client.from("saved_builds").select("user_id").eq("user_id", userA.id);
  record("registered-user-can-save-own-build", !savedBuild.error, savedBuild.error);
  record("other-user-cannot-save-or-read-saved-build", Boolean(foreignSavedBuild.error) && (foreignBuildRead.data ?? []).length === 0, foreignSavedBuild.error || foreignBuildRead.error);
  record("anonymous-user-cannot-save-build", Boolean(anonymousSavedBuild.error), anonymousSavedBuild.error);

  const slug = `security-rls-${runId}`;
  const comboInsert = await userA.client.from("created_combos").insert({
    user_id: userA.id,
    title: "Security RLS test",
    slug,
    cpu_id: cpuId,
    gpu_id: gpuId,
    ram_id: ramId,
  });
  const combo = await admin.from("created_combos").select("id").eq("slug", slug).maybeSingle();
  record("registered-user-can-create-own-combo", !comboInsert.error && Boolean(combo.data?.id), comboInsert.error);

  if (combo.data?.id) {
    const ownUpdate = await userA.client.from("created_combos").update({ title: "Updated security RLS test" }).eq("id", combo.data.id);
    const immutableUpdate = await userA.client.from("created_combos").update({ created_at: "2000-01-01T00:00:00.000Z" }).eq("id", combo.data.id);
    const foreignUpdate = await userB.client.from("created_combos").update({ title: "unauthorized" }).eq("id", combo.data.id);
    const unchanged = await admin.from("created_combos").select("title").eq("id", combo.data.id).maybeSingle();
    const foreignRead = await userB.client.from("created_combos").select("id").eq("id", combo.data.id);
    record("registered-user-can-update-own-combo", !ownUpdate.error && unchanged.data?.title === "Updated security RLS test", ownUpdate.error);
    record("created-combo-ownership-and-creation-time-are-immutable", Boolean(immutableUpdate.error), immutableUpdate.error);
    record("other-user-cannot-read-or-update-created-combo", (foreignRead.data ?? []).length === 0 && unchanged.data?.title === "Updated security RLS test", foreignUpdate.error || foreignRead.error);
  }

  const invalidCombo = await userA.client.from("created_combos").insert({
    user_id: userA.id, title: "Invalid combo", slug: `${slug}-invalid`, cpu_id: gpuId, gpu_id: cpuId, ram_id: ramId, custom_price_cpu_usd: 0,
  });
  record("created-combo-rejects-invalid-components-and-price", Boolean(invalidCombo.error), invalidCombo.error);

  const anonymousCombo = await anonymous.from("created_combos").insert({
    user_id: anonymousAuth.data.user.id,
    title: "Anonymous RLS test",
    slug: `${slug}-anonymous`,
    cpu_id: cpuId,
    gpu_id: gpuId,
    ram_id: ramId,
  });
  const anonymousComboRow = await admin.from("created_combos").select("id").eq("slug", `${slug}-anonymous`);
  record("anonymous-user-cannot-create-combo", Boolean(anonymousCombo.error) && (anonymousComboRow.data ?? []).length === 0, anonymousCombo.error);

  const buildSlug = `${slug}-build`;
  const buildInsert = await userA.client.from("created_builds").insert({
    user_id: userA.id, title: "Security RLS build", slug: buildSlug, cpu_id: cpuId, gpu_id: gpuId, ram_id: ramId,
    motherboard_id: motherboardId, storage_id: storageId, psu_id: psuId,
  });
  const build = await admin.from("created_builds").select("id,title,category,is_active").eq("slug", buildSlug).maybeSingle();
  record("registered-user-can-create-private-build", !buildInsert.error && build.data?.category === "Personalizada" && build.data?.is_active === false, buildInsert.error);

  if (build.data?.id) {
    const ownUpdate = await userA.client.from("created_builds").update({ title: "Updated security RLS build" }).eq("id", build.data.id);
    const immutableUpdate = await userA.client.from("created_builds").update({ created_at: "2000-01-01T00:00:00.000Z" }).eq("id", build.data.id);
    const foreignUpdate = await userB.client.from("created_builds").update({ title: "unauthorized" }).eq("id", build.data.id);
    const foreignRead = await userB.client.from("created_builds").select("id").eq("id", build.data.id);
    const unchanged = await admin.from("created_builds").select("title").eq("id", build.data.id).maybeSingle();
    record("registered-user-can-update-own-build", !ownUpdate.error && unchanged.data?.title === "Updated security RLS build", ownUpdate.error);
    record("created-build-ownership-and-creation-time-are-immutable", Boolean(immutableUpdate.error), immutableUpdate.error);
    record("other-user-cannot-read-or-update-created-build", (foreignRead.data ?? []).length === 0 && unchanged.data?.title === "Updated security RLS build", foreignUpdate.error || foreignRead.error);
  }

  const invalidBuild = await userA.client.from("created_builds").insert({
    user_id: userA.id, title: "Invalid build", slug: `${buildSlug}-invalid`, category: "Gaming", is_active: true,
    cpu_id: gpuId, gpu_id: cpuId, ram_id: ramId, motherboard_id: motherboardId, storage_id: storageId, psu_id: psuId,
    custom_price_cpu_usd: 0,
  });
  record("created-build-rejects-public-state-invalid-components-and-price", Boolean(invalidBuild.error), invalidBuild.error);

  const anonymousBuild = await anonymous.from("created_builds").insert({
    user_id: anonymousAuth.data.user.id, title: "Anonymous RLS build", slug: `${buildSlug}-anonymous`, cpu_id: cpuId, gpu_id: gpuId,
    ram_id: ramId, motherboard_id: motherboardId, storage_id: storageId, psu_id: psuId,
  });
  record("anonymous-user-cannot-create-build", Boolean(anonymousBuild.error), anonymousBuild.error);
} finally {
  await cleanup();
  const failed = results.filter((result) => !result.ok);
  console.log(JSON.stringify({ passed: failed.length === 0, failed: failed.map((result) => result.name), results }));
  if (failed.length > 0) process.exitCode = 1;
}
