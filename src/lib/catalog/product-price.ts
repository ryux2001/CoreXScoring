export type ProductPriceSource = "current" | "msrp" | "unavailable";

export interface ResolvedProductPrice {
  value: number;
  source: ProductPriceSource;
  hasCurrentPrice: boolean;
  currentPrice: number | null;
  msrpPrice: number | null;
}

type ProductPriceRow = Record<string, unknown> | null | undefined;

function toPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : null;
}

/**
 * Resolves the price shown to users in one currency. The current catalog price
 * wins; its launch MSRP is only a same-currency fallback.
 */
export function resolveProductPrice(product: ProductPriceRow, currency: string): ResolvedProductPrice {
  const suffix = currency === "EUR" ? "eur" : "usd";
  const currentPrice = toPrice(product?.[`price_${suffix}`]);
  const msrpPrice = toPrice(product?.[`price_base_${suffix}`]);

  if (currentPrice !== null) {
    return {
      value: currentPrice,
      source: "current",
      hasCurrentPrice: true,
      currentPrice,
      msrpPrice,
    };
  }

  if (msrpPrice !== null) {
    return {
      value: msrpPrice,
      source: "msrp",
      hasCurrentPrice: false,
      currentPrice: null,
      msrpPrice,
    };
  }

  return {
    value: 0,
    source: "unavailable",
    hasCurrentPrice: false,
    currentPrice: null,
    msrpPrice: null,
  };
}

export function getProductPrice(product: ProductPriceRow, currency: string): number {
  return resolveProductPrice(product, currency).value;
}
