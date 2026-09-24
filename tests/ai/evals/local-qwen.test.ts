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

  it("keeps a multi-turn build recommendation in scope after criteria are supplied", async () => {
    const result = await runChat([
      { role: "user", content: "Recomiéndame una build para gaming" },
      { role: "assistant", content: "¿Qué presupuesto tienes, a qué resolución juegas y qué prioridad prefieres?" },
      { role: "user", content: "Un aproximado de 700\nResolución 1080p\nAAA\nNinguna preferencia\nPriorizo la calidad precio" },
    ], {
      supabase: createSupabaseStub({ data: [cpuFixture], error: null }) as never,
      actor: { id: "evaluation-user", isAnonymous: false },
      pageContext: { pathname: "/catalog", route: "catalog" },
    }, "local-qwen-build-follow-up");

    expect(result.provider).toBe("local");
    expect(result.message.content).not.toMatch(/fuera de (mi|mi) alcance|reformula tu pregunta/i);
  }, 180_000);
});
