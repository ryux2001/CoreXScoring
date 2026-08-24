import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(command, ["exec", "vitest", "run", "tests/ai/evals/local-qwen.test.ts"], {
  stdio: "inherit",
  env: {
    ...process.env,
    AI_EVAL_LOCAL: "true",
    AI_LOCAL_ENABLED: "true",
    AI_LOCAL_ONLY: "true",
  },
});

child.on("error", (error) => {
  console.error("No se pudo iniciar la evaluación local de Qwen:", error.message);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`La evaluación local terminó por la señal ${signal}.`);
    process.exitCode = 1;
  } else {
    process.exitCode = code ?? 1;
  }
});
