import { describe, expect, it, vi } from "vitest";
import { getComponent, getCurrentComparison, getGameFps, proposeAddToComparison, proposeRemoveFromComparison, proposeSetComparisonPrice, proposeUpdateComparison, searchComponents, setCurrentCatalogPrice } from "@/lib/ai/tools/read";
import { executeAiTool } from "@/lib/ai/tools";
import { createQueryBuilder, createSupabaseStub } from "./helpers/query-builder";
import { cpuFixture, gameFixture, gpuFixture } from "./helpers/fixtures";

const actor = { id: "user-1", isAnonymous: false };

function comparatorContext(itemIds: string[]) {
  return {
    pathname: "/comparator",
    route: "comparator" as const,
    comparison: { itemIds },
  };
}

const comboFixture = {
  id: "combo-1440p",
  title: "Combo 1440p",
  slug: "combo-1440p",
  category: "Gaming",
  is_active: true,
  cpu_id: cpuFixture.id,
  gpu_id: gpuFixture.id,
  ram_id: "ram-32gb",
  cpu: cpuFixture,
  gpu: gpuFixture,
  ram: {
    id: "ram-32gb",
    name: "32 GB DDR5",
    brand: "Kingston",
    type: "ram",
    price_base_usd: 100,
    specs: { capacity: 32, speed: 6000, memory_type: "DDR5" },
  },
};

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

  it("reads game FPS from games.gpu_fps_base instead of product benchmarks", async () => {
    const gameBuilder = createQueryBuilder({ data: gameFixture, error: null });
    const productBuilder = createQueryBuilder({ data: [gpuFixture], error: null });
    const supabase = {
      from: vi.fn((table: string) => table === "games" ? gameBuilder : productBuilder),
    };

    const result = await getGameFps({
      gameSlug: gameFixture.slug,
      gpuIds: [gpuFixture.id],
      resolution: "1440p",
      preset: "ultra",
    }, {
      supabase: supabase as never,
      actor,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      source: "CoreXScoring · games.gpu_fps_base",
      mode: "gpu_direct",
      configuration: { preset: "ultra", resolution: "1440p" },
      components: [{ fps: { "1440p": 72 } }],
    });
    expect(JSON.stringify(result.data)).not.toContain("1440p_gaming_avg_fps");
    expect(productBuilder.in).toHaveBeenCalledWith("id", [gpuFixture.id]);
  });

  it("returns the available games when a FPS question lacks a game", async () => {
    const gameBuilder = createQueryBuilder({ data: [gameFixture], error: null });
    const supabase = { from: vi.fn(() => gameBuilder) };

    const result = await getGameFps({}, { supabase: supabase as never, actor });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toMatchObject({ games: [{ id: gameFixture.id, name: gameFixture.name }] });
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

  it("uses the verified custom comparison price instead of the catalog base price", async () => {
    const supabase = createSupabaseStub({ data: [cpuFixture, gpuFixture], error: null });
    const result = await getCurrentComparison({}, {
      supabase: supabase as never,
      actor,
      pageContext: comparatorContext([cpuFixture.id, gpuFixture.id]),
      priceContext: {
        scope: "comparison",
        currency: "USD",
        totalPrice: 899,
        items: [{
          productId: cpuFixture.id,
          name: cpuFixture.name,
          type: "cpu",
          price: 150,
          isCustom: true,
          qualityPriceScore: 9,
        }],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const components = (result.data as { components: Array<{ id: string; selectedPrice: { value: number }; priceSource: string }> }).components;
    expect(components.find((component) => component.id === cpuFixture.id)).toMatchObject({
      selectedPrice: { value: 150 },
      priceSource: "frontend_custom_verified",
    });
    expect(components.find((component) => component.id === gpuFixture.id)).toMatchObject({
      selectedPrice: { value: gpuFixture.price_base_usd },
      priceSource: "base",
    });
  });

  it("reads a combo comparison and returns a price-aware verdict", async () => {
    const comboBuilder = createQueryBuilder({ data: [comboFixture], error: null });
    const supabase = {
      from: vi.fn((table: string) => table === "combos" ? comboBuilder : createQueryBuilder({ data: [], error: null })),
    };
    const result = await getCurrentComparison({}, {
      supabase: supabase as never,
      actor,
      pageContext: {
        pathname: "/comparator",
        route: "comparator",
        comparison: {
          itemIds: [comboFixture.id],
          comparisonType: "combos",
          items: [{ id: comboFixture.id, entityType: "combo" }],
        },
      },
      priceContext: {
        scope: "comparison",
        currency: "USD",
        totalPrice: 1_249,
        items: [{ productId: gpuFixture.id, slot: "gpu", price: 500, isCustom: true, name: gpuFixture.name, type: "gpu", qualityPriceScore: 8 }],
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toMatchObject({ entityType: "combo", count: 1, items: [{ id: comboFixture.id }] });
  });

  it("rejects a mixed build/combo current comparison before querying data", async () => {
    const supabase = { from: vi.fn() };
    const result = await getCurrentComparison({}, {
      supabase: supabase as never,
      actor,
      pageContext: {
        pathname: "/comparator",
        route: "comparator",
        comparison: {
          itemIds: ["combo-1", "build-1"],
          items: [
            { id: "combo-1", entityType: "combo" },
            { id: "build-1", entityType: "build" },
          ],
        },
      },
    });

    expect(result).toEqual({ ok: false, error: "No se pueden comparar componentes, combos y builds entre sí. La comparativa debe contener un único tipo." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("applies a live price override to a combo part through the atomic snapshot", async () => {
    const comboBuilder = createQueryBuilder({ data: [comboFixture], error: null });
    const supabase = {
      from: vi.fn((table: string) => table === "combos" ? comboBuilder : createQueryBuilder({ data: [], error: null })),
    };
    const result = await proposeUpdateComparison({
      mode: "patch",
      priceOverrides: [{ id: gpuFixture.id, slot: "gpu", price: 500 }],
      currency: "USD",
    }, {
      supabase: supabase as never,
      actor,
      pageContext: {
        pathname: "/comparator",
        search: "?currency=USD",
        route: "comparator",
        comparison: {
          itemIds: [comboFixture.id],
          items: [{ id: comboFixture.id, entityType: "combo" }],
        },
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.comparisonAction).toMatchObject({
      type: "replace",
      evaluatedPartPrices: { [comboFixture.id]: { gpu: 500 } },
    });
  });

  it("returns a final game clarification for comparator FPS without entering another tool round", async () => {
    const comboBuilder = createQueryBuilder({ data: [comboFixture], error: null });
    const gamesBuilder = createQueryBuilder({ data: [{ id: gameFixture.id, slug: gameFixture.slug, name: gameFixture.name }], error: null });
    const supabase = {
      from: vi.fn((table: string) => table === "combos" ? comboBuilder : table === "games" ? gamesBuilder : createQueryBuilder({ data: [], error: null })),
    };
    const result = await getGameFps({ resolution: "4k" }, {
      supabase: supabase as never,
      actor,
      pageContext: {
        pathname: "/comparator",
        route: "comparator",
        comparison: {
          itemIds: [comboFixture.id],
          items: [{ id: comboFixture.id, entityType: "combo" }],
        },
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.finalResponse).toContain("necesito el juego");
  });

  it("calculates comparator FPS with the shared build/combo formula", async () => {
    const comboBuilder = createQueryBuilder({ data: [comboFixture], error: null });
    const gamesBuilder = createQueryBuilder({ data: gameFixture, error: null });
    const supabase = {
      from: vi.fn((table: string) => table === "combos" ? comboBuilder : table === "games" ? gamesBuilder : createQueryBuilder({ data: [], error: null })),
    };
    const result = await getGameFps({ gameSlug: gameFixture.slug, resolution: "4k", preset: "ultra" }, {
      supabase: supabase as never,
      actor,
      pageContext: {
        pathname: "/comparator",
        route: "comparator",
        comparison: {
          itemIds: [comboFixture.id],
          items: [{ id: comboFixture.id, entityType: "combo" }],
        },
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result).toMatchObject({ data: { mode: "comparison_estimate", resolution: "4k" } });
      expect(result.finalResponse).not.toMatch(/games|gpu_fps_base|products|tabla|tool|CPU\/RAM/i);
    }
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

  it("removes several comparison components in one atomic snapshot", async () => {
    const secondCpu = { ...cpuFixture, id: "cpu-9600", name: "AMD Ryzen 5 9600" };
    const supabase = createSupabaseStub({ data: [cpuFixture, secondCpu], error: null });
    const result = await proposeUpdateComparison({
      mode: "patch",
      removeIds: [cpuFixture.id, secondCpu.id],
    }, {
      supabase: supabase as never,
      actor,
      pageContext: comparatorContext([cpuFixture.id, secondCpu.id]),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.comparisonAction).toMatchObject({ type: "replace", items: [], evaluatedPrices: {} });
  });

  it("adds several components with their temporary prices in one snapshot", async () => {
    const secondGpu = { ...gpuFixture, id: "gpu-9070", name: "AMD Radeon RX 9070" };
    const supabase = createSupabaseStub({ data: [gpuFixture, secondGpu], error: null });
    const result = await proposeUpdateComparison({
      mode: "patch",
      additions: [{ id: gpuFixture.id, price: 700 }, { id: secondGpu.id, price: 650 }],
      currency: "USD",
    }, {
      supabase: supabase as never,
      actor,
      pageContext: comparatorContext([]),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.comparisonAction).toMatchObject({
      type: "replace",
      items: [{ id: gpuFixture.id }, { id: secondGpu.id }],
      evaluatedPrices: { [gpuFixture.id]: 700, [secondGpu.id]: 650 },
    });
  });

  it("replaces the whole comparison before adding the requested components", async () => {
    const secondCpu = { ...cpuFixture, id: "cpu-5600", name: "AMD Ryzen 5 5600" };
    const supabase = createSupabaseStub({ data: [cpuFixture, secondCpu, gpuFixture], error: null });
    const result = await proposeUpdateComparison({
      mode: "replace",
      additions: [{ id: cpuFixture.id }, { id: secondCpu.id }],
    }, {
      supabase: supabase as never,
      actor,
      pageContext: comparatorContext([gpuFixture.id]),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.comparisonAction).toMatchObject({
      type: "replace",
      items: [{ id: cpuFixture.id }, { id: secondCpu.id }],
    });
  });
});
