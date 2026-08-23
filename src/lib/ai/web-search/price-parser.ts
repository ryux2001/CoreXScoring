import type { ExternalPriceCurrency } from "./types";

export interface ParsedExternalPrice {
  price: number;
  currency: ExternalPriceCurrency;
  context: string;
  promotional: boolean;
  total: boolean;
  shipping: boolean;
}

const PRICE_PATTERN = /(?:((?:R\$|€|\$|£))\s*([\d\s.,]+)|([\d\s.,]+)\s*(R\$|€|EUR|\$|USD|£|GBP|BRL))/giu;

function currencyFrom(value: string): ExternalPriceCurrency | undefined {
  const normalized = value.toUpperCase();
  if (normalized === "€" || normalized === "EUR") return "EUR";
  if (normalized === "$" || normalized === "USD") return "USD";
  if (normalized === "£" || normalized === "GBP") return "GBP";
  if (normalized === "R$" || normalized === "BRL") return "BRL";
  return undefined;
}

function parseNumber(value: string): number | undefined {
  const compact = value.replace(/\s/g, "").replace(/[^\d.,]/g, "");
  if (!compact) return undefined;

  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalSeparator = lastComma > lastDot ? "," : lastDot > lastComma ? "." : undefined;
  let normalized = compact;

  if (decimalSeparator) {
    const decimalIndex = compact.lastIndexOf(decimalSeparator);
    const decimalDigits = compact.length - decimalIndex - 1;
    normalized = decimalDigits <= 2
      ? `${compact.slice(0, decimalIndex).replace(/[.,]/g, "")}.${compact.slice(decimalIndex + 1)}`
      : compact.replace(/[.,]/g, "");
  } else {
    normalized = compact.replace(/[.,]/g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 1_000_000 ? Number(parsed.toFixed(2)) : undefined;
}

export function extractPrices(value: string): ParsedExternalPrice[] {
  const prices: ParsedExternalPrice[] = [];
  for (const match of value.matchAll(PRICE_PATTERN)) {
    const currency = currencyFrom(match[1] || match[4] || "");
    const price = parseNumber(match[2] || match[3] || "");
    if (!currency || price === undefined) continue;
    const index = match.index ?? 0;
    // Las tiendas suelen separar el nombre del producto y el precio con
    // etiquetas HTML/Markdown. Un contexto algo más amplio permite validar
    // que el importe pertenece al modelo solicitado y no a un relacionado.
    const context = value.slice(Math.max(0, index - 180), Math.min(value.length, index + match[0].length + 180));
    // Las etiquetas que describen un importe deben estar cerca de ese
    // importe. Si usamos toda la ventana, el “Precio total” de un bundle
    // puede contaminar el precio base que aparece unas líneas antes.
    const nearby = value.slice(Math.max(0, index - 80), Math.min(value.length, index + match[0].length + 80));
    const before = value.slice(Math.max(0, index - 80), index);
    const after = value.slice(index + match[0].length, Math.min(value.length, index + match[0].length + 80));
    const promotional = /\b(?:cupon|cupón|descuento|discount|nuevo\s+usuario|new\s+user|ahorra|save|off|promo|oferta|pvpr|pvp|msrp|precio\s+recomendado)\b/i.test(before)
      || /\b(?:cupon|cupón|descuento|discount|nuevo\s+usuario|new\s+user|ahorra|save|off)\b/i.test(after);
    // Los extractores de tiendas suelen mostrar el importe final como
    // “Total”, “Total a pagar” o “Precio total”, sin una etiqueta uniforme.
    // Marcamos esas variantes para que el validador descarte el total.
    const total = /\b(?:precio\s+total|total\s+price|importe\s+total|total(?:\s+a\s+pagar|\s+de\s+la\s+compra)?)\b/i.test(nearby);
    const shipping = /\b(?:gastos?\s+de\s+(?:envio|envío)|coste\s+de\s+(?:envio|envío)|shipping\s+(?:cost|fee)|frete)\b/i.test(nearby);
    if (!prices.some((candidate) => candidate.price === price && candidate.currency === currency)) {
      prices.push({ price, currency, context, promotional, total, shipping });
    }
  }
  return prices.slice(0, 4);
}

const DEFAULT_EUR_RATES: Record<Exclude<ExternalPriceCurrency, "EUR">, number> = {
  USD: 0.92,
  GBP: 1.17,
  BRL: 0.16,
};

/** Conversión orientativa configurable; no pretende ser una cotización financiera. */
export function approximateEurEquivalent(price: ParsedExternalPrice): { value: number; rate: number } {
  if (price.currency === "EUR") return { value: Number(price.price.toFixed(2)), rate: 1 };
  const configuredRate = Number(process.env[`WEB_SEARCH_${price.currency}_TO_EUR`]);
  const rate = Number.isFinite(configuredRate) && configuredRate > 0
    ? configuredRate
    : DEFAULT_EUR_RATES[price.currency];
  return { value: Number((price.price * rate).toFixed(2)), rate };
}
