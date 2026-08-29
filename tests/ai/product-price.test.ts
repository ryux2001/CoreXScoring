import { describe, expect, it } from "vitest";
import { resolveProductPrice } from "@/lib/catalog/product-price";

describe("resolveProductPrice", () => {
  it("prioritizes the current price in the requested currency", () => {
    expect(resolveProductPrice({
      price_usd: 349,
      price_base_usd: 399,
      price_eur: 329,
      price_base_eur: 379,
    }, "USD")).toMatchObject({
      value: 349,
      source: "current",
      hasCurrentPrice: true,
    });
  });

  it("uses MSRP only when the current price is null for that currency", () => {
    expect(resolveProductPrice({
      price_usd: null,
      price_base_usd: 399,
      price_eur: 329,
      price_base_eur: 379,
    }, "USD")).toMatchObject({
      value: 399,
      source: "msrp",
      hasCurrentPrice: false,
    });
  });
});
