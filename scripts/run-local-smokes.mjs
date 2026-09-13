import { createServer } from "node:http";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appPort = 3100;
const appUrl = `http://localhost:${appPort}`;
const smokeFiles = process.env.SMOKE_FILES?.split(",").map((file) => file.trim()).filter(Boolean);

function parseSupabaseEnv(output) {
  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

async function supabaseStatus() {
  try {
    const result = await execFileAsync("supabase", ["status", "-o", "env"], { cwd: root });
    return { running: true, env: parseSupabaseEnv(`${result.stdout}\n${result.stderr}`) };
  } catch {
    return { running: false, env: {} };
  }
}

async function run(command, args, env = process.env) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} ${args.join(" ")} terminó con ${signal || code}`));
    });
  });
}

async function runWithTimeout(command, args, env, timeoutMs) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${args.at(-1)} superó el timeout de ${Math.round(timeoutMs / 1000)} segundos.`));
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} ${args.join(" ")} terminó con ${signal || code}`));
    });
  });
}

async function waitForHttp(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // The Next server is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }
  throw new Error(`No se pudo iniciar el servidor en ${url}.`);
}

function startMockProvider() {
  const server = createServer(async (request, response) => {
    if (request.method !== "POST") {
      response.writeHead(405).end();
      return;
    }
    for await (const chunk of request) {
      // Consume the request body before returning the deterministic completion.
      void chunk;
    }
    const payload = {
      id: "ci-mock-completion",
      object: "chat.completion",
      model: "ci-mock",
      choices: [{ index: 0, message: { role: "assistant", content: "Una CPU ejecuta instrucciones generales y una GPU procesa muchas operaciones en paralelo." }, finish_reason: "stop" }],
      usage: { prompt_tokens: 32, completion_tokens: 16, total_tokens: 48 },
    };
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(payload));
  });
  return new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(8787, "127.0.0.1", () => resolvePromise(server));
  });
}

function startApp(env) {
  const child = spawn(process.execPath, [resolve(root, "node_modules", "next", "dist", "bin", "next"), "start"], {
    cwd: root,
    env: { ...env, PORT: String(appPort) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  child.stdout.on("data", (chunk) => logs.push(String(chunk)));
  child.stderr.on("data", (chunk) => logs.push(String(chunk)));
  return { child, logs };
}

async function stopApp(app) {
  if (!app || app.child.exitCode !== null) return;
  app.child.kill("SIGTERM");
  await new Promise((resolvePromise) => {
    const timer = setTimeout(() => {
      app.child.kill("SIGKILL");
      resolvePromise();
    }, 5000);
    app.child.once("exit", () => {
      clearTimeout(timer);
      resolvePromise();
    });
  });
}

async function runSmoke(file, env) {
  await runWithTimeout(process.execPath, [resolve(root, "tests", "rls", file)], env, 90_000);
}

function shouldRun(file) {
  return !smokeFiles || smokeFiles.includes(file);
}

async function main() {
  const statusBefore = await supabaseStatus();
  let ownsSupabase = false;
  let mockProvider;
  let app;

  try {
    if (!statusBefore.running) {
      await run("supabase", ["start"], process.env);
      ownsSupabase = true;
    }

    const status = statusBefore.running ? statusBefore : await supabaseStatus();
    const supabaseUrl = status.env.API_URL || "http://127.0.0.1:54321";
    const anonKey = status.env.ANON_KEY;
    const serviceRoleKey = status.env.SERVICE_ROLE_KEY;
    if (!anonKey || !serviceRoleKey) throw new Error("Supabase local no devolvió ANON_KEY y SERVICE_ROLE_KEY.");

    const baseEnv = {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      SUPABASE_SECRET_KEY: serviceRoleKey,
      AI_ACTION_SECRET: "ci-ai-action-secret-012345678901234567890123",
      AI_IP_HASH_SECRET: "ci-ai-ip-hash-secret-012345678901234567890123",
      AI_PROVIDER_KEYS_ENCRYPTION_SECRET: "ci-ai-provider-secret-0123456789012345678901",
      RUN_LOCAL_SMOKES: "1",
    };

    const needsApp = ["security-headers-smoke.mjs", "ai-chat-smoke.mjs", "ai-action-api-smoke.mjs", "account-delete.mjs", "ai-privacy-retention.mjs"].some(shouldRun);
    if (needsApp) {
      await run(process.execPath, [resolve(root, "node_modules", "next", "dist", "bin", "next"), "build"], baseEnv);
    }

    for (const file of ["primary-vault.mjs", "ai-quota.mjs", "api-rate-limit.mjs", "password-recovery.mjs", "ai-pending-actions.mjs", "ai-abuse-controls.mjs"]) {
      if (shouldRun(file)) await runSmoke(file, baseEnv);
    }

    const localAppFiles = ["security-headers-smoke.mjs", "ai-chat-smoke.mjs", "ai-action-api-smoke.mjs", "account-delete.mjs"];
    if (localAppFiles.some(shouldRun)) {
      mockProvider = await startMockProvider();
      app = startApp({
        ...baseEnv,
        AI_LOCAL_ENABLED: "true",
        AI_LOCAL_ONLY: "true",
        AI_LOCAL_BASE_URL: "http://127.0.0.1:8787/v1",
        AI_LOCAL_MODEL: "ci-mock",
        SECURITY_HEADERS_SMOKE_URL: appUrl,
        AI_CHAT_SMOKE_URL: appUrl,
        ACCOUNT_DELETE_SMOKE_URL: appUrl,
      });
      await waitForHttp(`${appUrl}/catalog`);
      const localAppEnv = { ...baseEnv, AI_LOCAL_ENABLED: "true", AI_LOCAL_ONLY: "true", AI_LOCAL_BASE_URL: "http://127.0.0.1:8787/v1", AI_LOCAL_MODEL: "ci-mock", SECURITY_HEADERS_SMOKE_URL: appUrl, AI_CHAT_SMOKE_URL: appUrl, ACCOUNT_DELETE_SMOKE_URL: appUrl };
      for (const file of localAppFiles) {
        if (shouldRun(file)) await runSmoke(file, localAppEnv);
      }
      await stopApp(app);
      app = undefined;
      await new Promise((resolvePromise) => mockProvider.close(resolvePromise));
      mockProvider = undefined;
    }

    if (shouldRun("ai-privacy-retention.mjs")) {
      app = startApp({
        ...baseEnv,
        AI_LOCAL_ENABLED: "false",
        AI_LOCAL_ONLY: "false",
        GROQ_API_KEY: "ci-groq-placeholder",
        AI_GROQ_MODELS: "openai/gpt-oss-20b",
        AI_PRIVACY_SMOKE_URL: appUrl,
      });
      await waitForHttp(`${appUrl}/catalog`);
      await runSmoke("ai-privacy-retention.mjs", { ...baseEnv, AI_LOCAL_ENABLED: "false", AI_LOCAL_ONLY: "false", GROQ_API_KEY: "ci-groq-placeholder", AI_GROQ_MODELS: "openai/gpt-oss-20b", AI_PRIVACY_SMOKE_URL: appUrl });
    }
  } finally {
    await stopApp(app);
    if (mockProvider) await new Promise((resolvePromise) => mockProvider.close(resolvePromise));
    if (ownsSupabase) {
      await run("supabase", ["stop", "--no-backup"], process.env).catch(() => undefined);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
