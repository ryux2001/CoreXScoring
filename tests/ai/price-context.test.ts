import { describe, expect, it, vi } from "vitest";
import { formatAiPriceContext, resolveAiFrontendPriceContext, resolveAiPagePriceContext } from "@/lib/ai/price-context";
import { cpuFixture } from "./helpers/fixtures";

function supabaseForProducts(products: unknown[]) {
  const inQuery = vi.fn(async () => ({ data: products, error: null }));
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ in: inQuery })),
    })),
  };
}

describe("AI effective price context", () => {
  it("uses a verified custom catalog price instead of the base price", async () => {
    const supabase = supabaseForProducts([cpuFixture]);
    const context = await resolveAiFrontendPriceContext(supabase, {
      scope: "catalog",
      currency: "USD",
      items: [{ productId: cpuFixture.id, price: 150, isCustom: true }],
    }, {
      pathname: `/catalog/${cpuFixture.slug}`,
      entityType: "product",
      entityId: cpuFixture.id,
    });

    expect(context).toMatchObject({
      scope: "catalog",
      currency: "USD",
      totalPrice: 150,
      items: [{ productId: cpuFixture.id, price: 150, isCustom: true }],
    });
    expect(formatAiPriceContext(context)).toContain("precio personalizado activo");
    expect(formatAiPriceContext(context)).toContain("150.00 USD");
  });

  it("rejects a frontend price for a product that is not in the active comparison", async () => {
    const supabase = supabaseForProducts([cpuFixture]);
    const context = await resolveAiFrontendPriceContext(supabase, {
      scope: "comparison",
      currency: "USD",
      items: [{ productId: "other-product", price: 150, isCustom: true }],
    }, {
      pathname: "/comparator",
      route: "comparator",
      comparison: { itemIds: [cpuFixture.id] },
    });

    expect(context).toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("uses saved build component prices and includes their total", async () => {
    const gpu = { ...cpuFixture, id: "gpu-1", name: "GPU de prueba", type: "gpu", price_base_usd: 300 };
    const supabase = supabaseForProducts([{ ...cpuFixture, price_base_usd: 229 }, gpu]);
    const context = await resolveAiPagePriceContext(supabase, {
      pathname: "/builds/test",
      search: "?currency=USD",
      entityType: "build",
      entityComponents: [
        { id: cpuFixture.id, slot: "cpu", customPriceUsd: 150 },
        { id: gpu.id, slot: "gpu" },
      ],
    });

    expect(context).toMatchObject({
      scope: "build",
      totalPrice: 450,
      items: [
        { productId: cpuFixture.id, price: 150, isCustom: true, slot: "cpu" },
        { productId: gpu.id, price: 300, isCustom: false, slot: "gpu" },
      ],
    });
  });
});
