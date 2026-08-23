export interface TrustedRetailer {
  key: string;
  label: string;
  domains: string[];
}

/** Dominios controlados por el servidor; el modelo nunca puede ampliarlos. */
export const TRUSTED_RETAILERS: TrustedRetailer[] = [
  { key: "pccomponentes", label: "PcComponentes", domains: ["pccomponentes.com"] },
  { key: "amazon", label: "Amazon", domains: ["amazon.es"] },
  { key: "ebay", label: "eBay", domains: ["ebay.es"] },
  { key: "aliexpress", label: "AliExpress", domains: ["www.aliexpress.com", "es.aliexpress.com"] },
];

export const TRUSTED_SEARCH_DOMAINS = TRUSTED_RETAILERS.flatMap((retailer) => retailer.domains);

function normalizeRetailer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function resolveTrustedRetailer(value: string | undefined): TrustedRetailer | undefined {
  if (!value?.trim()) return undefined;
  const normalized = normalizeRetailer(value);
  return TRUSTED_RETAILERS.find((retailer) => (
    normalizeRetailer(retailer.key) === normalized
      || normalizeRetailer(retailer.label) === normalized
      || retailer.domains.some((domain) => normalizeRetailer(domain) === normalized)
  ));
}

export function retailerForDomain(url: string): TrustedRetailer | undefined {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return TRUSTED_RETAILERS.find((retailer) => retailer.domains.some((domain) => (
      hostname === domain.replace(/^www\./, "")
    )));
  } catch {
    return undefined;
  }
}

export function isTrustedUrl(value: string): boolean {
  return Boolean(retailerForDomain(value));
}
