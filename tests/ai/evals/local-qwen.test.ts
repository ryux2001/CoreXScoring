import { describe, expect, it } from "vitest";
import { runChat } from "@/lib/ai/gateway";
import { createSupabaseStub } from "../helpers/query-builder";
import { cpuFixture } from "../helpers/fixtures";

const localEvaluationEnabled = process.env.AI_EVAL_LOCAL === "true";

describe.skipIf(!localEvaluationEnabled)("Qwen local conversational evaluation", () => {
  it("returns a structured CoreX AI response through the local provider", async () => {
    const result = await runChat([
      { role: "user", content: "Explícame brevemente qué diferencia hay entre una CPU y una GPU." },
    ], {
      supabase: createSupabaseStub({ data: [cpuFixture], error: null }) as never,
      actor: { id: "evaluation-user", isAnonymous: false },
      pageContext: { pathname: "/catalog", route: "catalog" },
    }, "local-qwen-evaluation");

    expect(result.provider).toBe("local");
    expect(result.message.role).toBe("assistant");
    expect(result.message.content.trim().length).toBeGreaterThan(20);
    expect(result.message.content).not.toMatch(/api[_ -]?key|prompt del sistema|tool_calls?/i);
  }, 180_000);
});
