import { calculateCatalogPriceEvaluation } from "@/lib/catalog/price-evaluation";
import { convertPrice } from "@/lib/currency";
import type { AiFrontendPriceContext, AiResolvedPriceContext, PageContext } from "./types";

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      in: (column: string, values: string[]) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
    };
  };
};

type Row = Record<string, unknown>;

function asRow(value: unknown): Row {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getAllowedProductIds(input: AiFrontendPriceContext, pageContext?: PageContext): Set<string> | null {
  if (input.scope === "catalog") {
    return pageContext?.entityType === "product" && pageContext.entityId
      ? new Set([pageContext.entityId])
      : null;
  }
  if (input.scope === "comparison") {
    return pageContext?.route === "comparator" && pageContext.comparison?.itemIds.length
      ? new Set(pageContext.comparison.itemIds)
      : null;
  }
  if (input.scope === "build" || input.scope === "combo") {
    const expectedEntity = input.scope === "build" ? ["build", "saved_build"] : ["combo", "saved_combo"];
    if (!pageContext?.entityType || !expectedEntity.includes(pageContext.entityType)) return null;
    return new Set((pageContext.entityComponents || []).map((component) => component.id));
  }
  // Los borradores todavía no existen en base de datos. Sus productos se
  // reconsultan abajo y los precios nunca se persisten desde este contexto.
  return new Set(input.items.map((item) => item.productId));
}

/** Vuelve a consultar productos y recalcula C/P: nunca acepta puntuaciones del navegador. */
export async function resolveAiFrontendPriceContext(
  supabase: unknown,
  input: AiFrontendPriceContext | undefined,
  pageContext?: PageContext,
): Promise<AiResolvedPriceContext | undefined> {
  if (!input) return undefined;
  const client = supabase as SupabaseLike;
  const allowedProductIds = getAllowedProductIds(input, pageContext);
  if (!allowedProductIds) return undefined;

  const items = input.items.filter((item) => allowedProductIds.has(item.productId));
  if (items.length === 0) return undefined;

  const uniqueIds = Array.from(new Set(items.map((item) => item.productId)));
  const { data, error } = await client.from("products").select("*").in("id", uniqueIds);
  if (error || !data) return undefined;

  const productsById = new Map(data.map((product) => {
    const row = asRow(product);
    return [asText(row.id), row];
  }));

  const resolvedItems = items.flatMap((item) => {
    const product = productsById.get(item.productId);
    if (!product) return [];
    const evaluation = calculateCatalogPriceEvaluation({
      product,
      productId: item.productId,
      price: item.price,
      currency: input.currency,
      source: item.isCustom ? "manual" : "base",
    });
    if (!evaluation) return [];
    return [{
      ...item,
      price: evaluation.price,
      name: asText(product.name) || "Componente",
      type: asText(product.type),
      qualityPriceScore: evaluation.qualityPriceScore,
    }];
  });

  if (resolvedItems.length === 0) return undefined;
  return {
    scope: input.scope,
    currency: input.currency,
    items: resolvedItems,
    totalPrice: Math.round(resolvedItems.reduce((total, item) => total + item.price, 0) * 100) / 100,
  };
}

/** Resuelve precios base o personalizados ya guardados en una build/combo visible. */
export async function resolveAiPagePriceContext(
  supabase: unknown,
  pageContext?: PageContext,
): Promise<AiResolvedPriceContext | undefined> {
  const scope = pageContext?.entityType === "build" || pageContext?.entityType === "saved_build"
    ? "build"
    : pageContext?.entityType === "combo" || pageContext?.entityType === "saved_combo"
      ? "combo"
      : undefined;
  const components = pageContext?.entityComponents || [];
  if (!scope || components.length === 0) return undefined;

  const currency = new URLSearchParams(pageContext?.search || "").get("currency") === "EUR" ? "EUR" : "USD";
  const client = supabase as SupabaseLike;
  const { data, error } = await client.from("products").select("*").in("id", components.map((component) => component.id));
  if (error || !data) return undefined;
  const products = new Map(data.map((product) => {
    const row = asRow(product);
    return [asText(row.id), row];
  }));
  const items = components.flatMap((component) => {
    const product = products.get(component.id);
    if (!product) return [];
    const customPrice = currency === "EUR"
      ? component.customPriceEur ?? (component.customPriceUsd ? convertPrice(component.customPriceUsd, "USD", "EUR") : undefined)
      : component.customPriceUsd ?? (component.customPriceEur ? convertPrice(component.customPriceEur, "EUR", "USD") : undefined);
    const basePrice = Number(currency === "EUR" ? product.price_base_eur : product.price_base_usd);
    const price = customPrice ?? basePrice;
    return Number.isFinite(price) && price > 0
      ? [{ productId: component.id, price, isCustom: customPrice !== undefined, slot: component.slot }]
      : [];
  });
  return resolveAiFrontendPriceContext(supabase, { scope, currency, items }, pageContext);
}

export function formatAiPriceContext(context: AiResolvedPriceContext | undefined): string {
  if (!context) return "";
  const items = context.items.map((item) => (
    `${item.slot ? `${item.slot}: ` : ""}${item.name} = ${item.price.toFixed(2)} ${context.currency} (${item.isCustom ? "precio personalizado activo" : "precio base visible"}; C/P ${item.qualityPriceScore.toFixed(2)}/10)`
  )).join("; ");
  return `\n\nPrecios efectivos verificados en la interfaz: ${items}. Total: ${context.totalPrice.toFixed(2)} ${context.currency}. Estos precios tienen prioridad sobre cualquier precio base o de referencia al recomendar; no los sustituyas ni inventes otros precios.`;
}
