import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const requiredMigrations = [
  { version: "20260913120000", name: "harden_ai_pending_action_creation" },
  { version: "20260913130000", name: "ai_abuse_controls" },
  { version: "20260913140000", name: "add_cerebras_byok" },
  { version: "20260913150000", name: "bind_pending_actions_to_requests" },
];

function migrationOccurrences(output, migration) {
  return output.split(migration).length - 1;
}

try {
  const { stdout, stderr } = await execFileAsync("supabase", ["migration", "list"], {
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024,
  });
  const output = `${stdout}\n${stderr}`;
  const missing = requiredMigrations.filter((migration) => migrationOccurrences(output, migration.version) < 2);
  if (missing.length > 0) {
    console.error("Migraciones pendientes o no visibles en remoto:");
    for (const migration of missing) console.error(`- ${migration.version}_${migration.name}`);
    console.error("Este check no ejecuta db push. Revisa el proyecto vinculado y aplica migraciones de forma explícita.");
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ ok: true, checked: requiredMigrations.map((migration) => `${migration.version}_${migration.name}`) }));
  }
} catch (error) {
  console.error("No se pudo consultar Supabase remoto con `supabase migration list`.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
