import type { ExternalPriceAvailability, ExternalPriceCandidate } from "./types";
import { retailerForDomain } from "./trusted-domains";
import { approximateEurEquivalent, extractPrices } from "./price-parser";
import type { TavilySearchResult } from "./tavily-client";

const EXCLUDED_TERMS = /\b(?:reacondicionado|reacondicionada|refurbished|renewed|segunda\s+mano|used|outlet|broken|solo\s+repuesto|repuesto|not\s+brand\s+new|not\s+new|no\s+es\s+nuevo)\b/i;
const UNAVAILABLE_TERMS = /\b(?:sin\s+stock|agotado|agotada|out\s+of\s+stock|sold\s+out|no\s+disponible)\b/i;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalize(value).split(" ").filter((token) => token.length >= 2);
}

function isVariantMismatch(productQuery: string, title: string): boolean {
  const queryModels = tokens(productQuery).filter((token) => /\d/.test(token));
  const titleTokens = tokens(title);
  const titleModels = titleTokens.filter((token) => /\d/.test(token));
  const variantMarkers = new Set(["x", "xt", "g", "ge", "ti", "super", "oc", "fe"]);
  return queryModels.some((queryModel) => {
    const combinedVariant = titleModels.some((titleModel) => {
      if (!titleModel.startsWith(queryModel) || titleModel === queryModel) return false;
      const suffix = titleModel.slice(queryModel.length);
      return variantMarkers.has(suffix);
    });
    if (combinedVariant) return true;

    const modelIndex = titleTokens.indexOf(queryModel);
    const nextToken = modelIndex >= 0 ? titleTokens[modelIndex + 1] : undefined;
    return Boolean(nextToken && variantMarkers.has(nextToken) && !tokens(productQuery).includes(nextToken));
  });
}

function productMatch(productQuery: string, title: string, content: string): { matched: boolean; exact: boolean } {
  const normalizedQuery = normalize(productQuery);
  const normalizedText = normalize(`${title} ${content}`);
  if (!normalizedQuery || !normalizedText || isVariantMismatch(productQuery, title)) {
    return { matched: false, exact: false };
  }

  if (normalizedText.includes(normalizedQuery)) return { matched: true, exact: true };
  const queryTokens = tokens(productQuery);
  const textTokens = new Set(tokens(`${title} ${content}`));
  const matchingTokens = queryTokens.filter((token) => textTokens.has(token)).length;
  return {
    matched: matchingTokens >= Math.max(1, Math.ceil(queryTokens.length * 0.65)),
    exact: matchingTokens === queryTokens.length,
  };
}

function availabilityFor(text: string): ExternalPriceAvailability {
  return UNAVAILABLE_TERMS.test(text) ? "unavailable" : "unknown";
}

function isCandidatePage(value: string): boolean {
  try {
    const pathname = new URL(value).pathname.toLowerCase();
    return !/(?:\/wiki(?:-|\/)|\/search|\/sch(?:$|\/)|\/category|\/categories|\/stores?\/)/.test(pathname);
  } catch {
    return false;
  }
}

function isListingPage(value: string): boolean {
  try {
    return /(?:\/w\/|\/wholesale|\/sch(?:$|\/))/.test(new URL(value).pathname.toLowerCase());
  } catch {
    return false;
  }
}

function isDirectProductPage(value: string, retailerKey: string): boolean {
  try {
    const pathname = new URL(value).pathname.toLowerCase();
    if (retailerKey === "ebay") return /\/itm\//.test(pathname);
    if (retailerKey === "amazon") return /\/(?:dp|gp\/product)\//.test(pathname);
    return true;
  } catch {
    return false;
  }
}

export function validateTavilyCandidate(
  result: TavilySearchResult,
  productQuery: string,
  referencePriceEur?: number,
): ExternalPriceCandidate | null {
  const title = typeof result.title === "string" ? result.title.trim().slice(0, 240) : "";
  const url = typeof result.url === "string" ? result.url.trim() : "";
  const snippet = typeof result.content === "string" ? result.content.trim().slice(0, 2_000) : "";
  const rawContent = typeof result.raw_content === "string" ? result.raw_content.trim().slice(0, 6_000) : "";
  const content = `${snippet}\n${rawContent}`.trim();
  const retailer = retailerForDomain(url);
  if (!title || !url || !retailer || !isCandidatePage(url)) return null;
  if (retailer.key === "ebay" && !isDirectProductPage(url, retailer.key)) return null;

  const combinedText = `${title} ${content}`;
  if (EXCLUDED_TERMS.test(combinedText)) return null;
  const match = productMatch(productQuery, title, content);
  if (!match.matched) return null;
  const titleMatch = productMatch(productQuery, title, "");
  if (!titleMatch.matched || !titleMatch.exact) return null;

  const parsedPrices = extractPrices(combinedText);
  const selectedPrice = parsedPrices
    .filter((candidate) => !candidate.promotional)
    // En fichas de hardware aparecen configuradores que muestran un total
    // (por ejemplo, CPU + placa). Nunca es el precio del componente buscado.
    .filter((candidate) => !candidate.total)
    // Una ficha puede incluir precios de productos relacionados. El importe
    // solo es válido si su contexto inmediato menciona el modelo buscado.
    .filter((candidate) => {
      const contextMatch = productMatch(productQuery, candidate.context, "");
      return contextMatch.matched && contextMatch.exact;
    })
    .map((candidate) => ({
      candidate,
      eurEquivalent: approximateEurEquivalent(candidate),
    }))
    .filter(({ eurEquivalent }) => eurEquivalent.value >= 5 && (!referencePriceEur || (
      eurEquivalent.value >= referencePriceEur * 0.2 && eurEquivalent.value <= referencePriceEur * 3
    )))
    .sort((left, right) => {
      if (left.candidate.total !== right.candidate.total) return left.candidate.total ? 1 : -1;
      if (left.candidate.shipping !== right.candidate.shipping) return left.candidate.shipping ? 1 : -1;
      if (left.candidate.currency === "EUR" && right.candidate.currency !== "EUR") return -1;
      if (left.candidate.currency !== "EUR" && right.candidate.currency === "EUR") return 1;
      return (left.candidate.context.length - right.candidate.context.length);
    })[0];
  const parsedPrice = selectedPrice?.candidate;
  const eurEquivalent = selectedPrice?.eurEquivalent;
  const availability = availabilityFor(combinedText);
  const relevance = typeof result.score === "number" && Number.isFinite(result.score)
    ? Math.min(Math.max(result.score, 0), 1)
    : 0.35;
  const confidence = Math.min(
    0.98,
    Math.max(0.2, 0.28 + relevance * 0.3 + (match.exact ? 0.24 : 0.08) + (parsedPrice ? 0.16 : 0) + (availability === "available" ? 0.04 : 0)),
  );
  const notes: string[] = [];
  if (parsedPrice && parsedPrice.currency !== "EUR") {
    notes.push(`No se detectó un precio en euros; ${parsedPrice.price.toFixed(2)} ${parsedPrice.currency} equivale aproximadamente a ${eurEquivalent?.value.toFixed(2)} €.`);
  }
  if (parsedPrice?.total) notes.push("El importe detectado parece corresponder al total de la compra, posiblemente con envío incluido.");
  if (parsedPrice?.shipping) notes.push("El importe detectado puede incluir gastos de envío.");
  if (availability === "unavailable") notes.push("El resultado contiene indicios de falta de stock.");
  if (retailer.key !== "pccomponentes") notes.push("Puede tratarse de un marketplace o vendedor externo; verifica el vendedor.");
  if (isListingPage(url)) notes.push("Es un listado o página de marketplace, no una ficha individual verificada.");

  const listingPenalty = isListingPage(url) ? 0.12 : 0;
  const finalConfidence = Math.min(0.98, Math.max(0.2, confidence - listingPenalty));

  return {
    retailer: retailer.label,
    domain: new URL(url).hostname,
    title,
    url,
    ...(parsedPrice ? {
      price: parsedPrice.price,
      currency: parsedPrice.currency,
      eurEquivalent: eurEquivalent?.value,
      exchangeRate: eurEquivalent?.rate,
    } : {}),
    confidence: Number(finalConfidence.toFixed(2)),
    availability,
    notes,
  } satisfies ExternalPriceCandidate;
}
