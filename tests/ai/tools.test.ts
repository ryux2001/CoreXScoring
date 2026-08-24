import { describe, expect, it, vi } from "vitest";
import { getComponent, getCurrentComparison, proposeAddToComparison, proposeRemoveFromComparison, proposeSetComparisonPrice, searchComponents, setCurrentCatalogPrice } from "@/lib/ai/tools/read";
import { executeAiTool } from "@/lib/ai/tools";
import { createQueryBuilder, createSupabaseStub } from "./helpers/query-builder";
import { cpuFixture, gpuFixture } from "./helpers/fixtures";

const actor = { id: "user-1", isAnonymous: false };

function comparatorContext(itemIds: string[]) {
  return {
    pathname: "/comparator",
    route: "comparator" as const,
    comparison: { itemIds },
  };
}

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

  it("reads the current comparison by verified product IDs", async () => {
    const supabase = createSupabaseStub({ data: [cpuFixture, gpuFixture], error: null });
    const result = await getCurrentComparison({}, {
      supabase: supabase as never,
      actor,
      pageContext: comparatorContext([cpuFixture.id, gpuFixture.id]),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toMatchObject({ count: 2 });
    expect(supabase.builder.in).toHaveBeenCalledWith("id", [cpuFixture.id, gpuFixture.id]);
  });

  it("prepares an add action only after validating the comparator and product", async () => {
    const currentBuilder = createQueryBuilder({ data: [cpuFixture], error: null });
    const secondCpu = { ...cpuFixture, id: "cpu-7700x3d", name: "AMD Ryzen 7 7700X3D" };
    const productBuilder = createQueryBuilder({ data: secondCpu, error: null });
    const supabase = {
      from: vi.fn((table: string) => table === "products" ? currentBuilder : productBuilder),
    };
    const result = await proposeAddToComparison({ id: secondCpu.id }, {
      supabase: supabase as never,
      actor,
      pageContext: comparatorContext([cpuFixture.id]),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.comparisonAction).toMatchObject({ type: "add", itemId: secondCpu.id });
    expect(productBuilder.eq).toHaveBeenCalledWith("id", secondCpu.id);
  });

  it("prepares a remove action only for a component in the current comparison", async () => {
    const productBuilder = createQueryBuilder({ data: cpuFixture, error: null });
    const supabase = { from: vi.fn(() => productBuilder) };
    const result = await proposeRemoveFromComparison({ id: cpuFixture.id }, {
      supabase: supabase as never,
      actor,
      pageContext: comparatorContext([cpuFixture.id]),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.comparisonAction).toMatchObject({ type: "remove", itemId: cpuFixture.id });
  });

  it("prepares a temporary comparison price only for a current component", async () => {
    const productBuilder = createQueryBuilder({ data: cpuFixture, error: null });
    const supabase = { from: vi.fn(() => productBuilder) };
    const result = await proposeSetComparisonPrice({ id: cpuFixture.id, price: 200, currency: "USD" }, {
      supabase: supabase as never,
      actor,
      pageContext: { ...comparatorContext([cpuFixture.id]), search: "?currency=USD" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.comparisonAction).toMatchObject({ type: "set_price", itemId: cpuFixture.id, price: 200, currency: "USD" });
  });
});
