import { convertPrice, normalizeCurrency, roundCurrency, type Currency } from "@/lib/currency";
import { getComponentNotes } from "@/lib/scoring/components";

export type CatalogValueProfile = "balanced" | "gaming" | "creation" | "productivity";
export type CatalogPriceSource = "base" | "manual" | "market" | "chat";

export interface CatalogPriceEvaluation {
  productId: string;
  price: number;
  currency: Currency;
  priceUsd: number;
  valueProfile?: CatalogValueProfile;
  qualityPriceScore: number;
  source: CatalogPriceSource;
  updatedAt: number;
}

export interface CatalogPriceEvaluationInput {
  product: Record<string, unknown>;
  productId: string;
  price: number;
  currency: Currency;
  valueProfile?: CatalogValueProfile;
  source: CatalogPriceSource;
}

export function isCatalogValueProfile(value: unknown): value is CatalogValueProfile {
  return value === "balanced" || value === "gaming" || value === "creation" || value === "productivity";
}

export function calculateCatalogPriceEvaluation(input: CatalogPriceEvaluationInput): CatalogPriceEvaluation | null {
  const price = Number(input.price);
  if (!input.productId || !Number.isFinite(price) || price <= 0 || price > 1_000_000) return null;

  const currency = normalizeCurrency(input.currency);
  const priceUsd = convertPrice(price, currency, "USD");
  const notes = getComponentNotes(input.product, priceUsd, input.valueProfile);
  const qualityPriceScore = Number(notes["Calidad precio"]);

  return {
    productId: input.productId,
    price: roundCurrency(price),
    currency,
    priceUsd,
    valueProfile: input.valueProfile,
    qualityPriceScore: Number.isFinite(qualityPriceScore) ? Math.round(qualityPriceScore * 100) / 100 : 0,
    source: input.source,
    updatedAt: Date.now(),
  };
}

