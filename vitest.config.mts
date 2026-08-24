import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    include: ["tests/ai/**/*.test.ts"],
    environment: "node",
    globals: false,
    isolate: true,
    restoreMocks: true,
    clearMocks: true,
  },
  coverage: {
    include: ["src/lib/ai/**/*.ts"],
    reporter: ["text", "json-summary"],
  },
});
