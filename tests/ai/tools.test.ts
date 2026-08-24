import { describe, expect, it } from "vitest";
import { getComponent, searchComponents, setCurrentCatalogPrice } from "@/lib/ai/tools/read";
import { executeAiTool } from "@/lib/ai/tools";
import { createSupabaseStub } from "./helpers/query-builder";
import { cpuFixture } from "./helpers/fixtures";

const actor = { id: "user-1", isAnonymous: false };

describe("CoreX AI tools", () => {
  it("searches only the bounded catalog result set", async () => {
    const supabase = createSupabaseStub({ data: [cpuFixture], error: null });
    const result = await searchComponents({ query: "7800X3D", type: "cpu", limit: 8 }, {
      supabase: supabase as never,
      actor,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toMatchObject({ count: 1 });
    expect(supabase.builder.limit).toHaveBeenCalledWith(8);
    expect(supabase.builder.eq).toHaveBeenCalledWith("type", "cpu");
  });

  it("rejects an unknown tool name through the allowlist", async () => {
    const result = await executeAiTool("run_sql", {}, {
      supabase: {} as never,
      actor,
    });
    expect(result).toEqual({ ok: false, error: "La tool solicitada no está disponible." });
  });

  it("requires a real page component before applying a temporary price", async () => {
    const result = await setCurrentCatalogPrice({ price: 250 }, {
      supabase: {} as never,
      actor,
    });
    expect(result).toEqual({ ok: false, error: "Esta acción solo está disponible dentro de la ficha de un componente." });
  });

  it("returns component data from the server-side lookup", async () => {
    const supabase = createSupabaseStub({ data: cpuFixture, error: null });
    const result = await getComponent({ id: cpuFixture.id }, {
      supabase: supabase as never,
      actor,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toMatchObject({ component: { id: cpuFixture.id, type: "CPU" } });
  });
});
