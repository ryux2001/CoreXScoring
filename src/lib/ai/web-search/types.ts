export type ExternalPriceCurrency = "EUR" | "USD" | "GBP" | "BRL";
export type ExternalPriceAvailability = "available" | "unavailable" | "unknown";

export interface ExternalPriceSearchInput {
  productQuery?: string;
  componentId?: string;
  country?: "ES";
  retailer?: string;
  mode?: "best_price" | "specific_retailer";
}

export interface ExternalPriceCandidate {
  retailer: string;
  domain: string;
  title: string;
  url: string;
  price?: number;
  currency?: ExternalPriceCurrency;
  eurEquivalent?: number;
  exchangeRate?: number;
  confidence: number;
  availability: ExternalPriceAvailability;
  notes: string[];
}

export interface ExternalPriceSearchResult {
  product: string;
  query: string;
  country: "ES";
  provider: "tavily" | "brave";
  searchedAt: string;
  bestCandidate?: ExternalPriceCandidate;
  bestApproximateCandidate?: ExternalPriceCandidate;
  candidates: ExternalPriceCandidate[];
  warnings: string[];
}
