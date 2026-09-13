import type { AiSupabaseClient } from "./tools/types";
import type { ComparisonContext, PageContext, PageEntityType, PageRoute } from "./types";

interface PageLocation {
  route: PageRoute;
  identifier?: string;
  entityType?: PageEntityType;
  slug?: string;
  savedTable?: "created_combos" | "created_builds";
}

type Row = Record<string, unknown>;

function asText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function asPrice(value: unknown): number | undefined {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : undefined;
}

function asRow(value: unknown): Row {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function getPageLocation(pathname: string): PageLocation {
  const segments = pathname.split("/").filter(Boolean).map((segment) => {
    try { return decodeURIComponent(segment); } catch { return segment; }
  });
  const [root, second, third] = segments;
  if (!root) return { route: "home" };
  if (root === "catalog" && second) return { route: "catalog", identifier: second, entityType: "product", slug: second };
  if (root === "combos" && second) return { route: "combo", identifier: second, entityType: "combo", slug: second };
  if (root === "builds" && second) return { route: "build", identifier: second, entityType: "build", slug: second };
  if (root === "vault" && second === "combos-created" && third) return { route: "vault", identifier: third, entityType: "saved_combo", slug: third, savedTable: "created_combos" };
  if (root === "vault" && second === "builds-created" && third) return { route: "vault", identifier: third, entityType: "saved_build", slug: third, savedTable: "created_builds" };
  return { route: root === "comparator" ? "comparator" : root === "vault" ? "vault" : "other", identifier: second };
}

function getComponentNames(row: Row, slots: string[]): string[] {
  return slots.flatMap((slot) => {
    const component = asRow(row[slot]);
    const name = asText(component.name);
    return name ? [`${slot}: ${name}`] : [];
  });
}

function getEntitySummary(row: Row, slots: string[]): string | undefined {
  const parts = getComponentNames(row, slots);
  return parts.length > 0 ? parts.join(" · ").slice(0, 500) : undefined;
}

function getEntityComponents(row: Row, slots: string[]) {
  return slots.flatMap((slot) => {
    const component = asRow(row[slot]);
    const id = asText(component.id);
    if (!id) return [];
    const customPriceUsd = asPrice(row[`custom_price_${slot}_usd`]);
    const customPriceEur = asPrice(row[`custom_price_${slot}_eur`]);
    return [{
      id,
      slot,
      ...(customPriceUsd !== undefined ? { customPriceUsd } : {}),
      ...(customPriceEur !== undefined ? { customPriceEur } : {}),
    }];
  });
}

async function resolveComparisonContext(
  supabase: AiSupabaseClient,
  context: PageContext,
  route: PageRoute,
): Promise<ComparisonContext | undefined> {
  if (route !== "comparator" || !context.comparison?.itemIds.length) return undefined;

  const requestedIds = Array.from(new Set(context.comparison.itemIds)).slice(0, 3);
  const { data } = await supabase
    .from("products")
    .select("id,type")
    .in("id", requestedIds);

  const foundById = new Map(
    (data || []).map((row) => [String((row as Row).id), String((row as Row).type || "").toLowerCase()]),
  );
  const itemIds = requestedIds.filter((id) => foundById.has(id));
  const types = new Set(itemIds.map((id) => foundById.get(id)).filter(Boolean));

  return {
    itemIds,
    ...(types.size === 1 ? { componentType: [...types][0] } : {}),
  };
}

export async function resolvePageContext(
  supabase: AiSupabaseClient,
  context: PageContext | undefined,
  userId: string,
  isAnonymous: boolean,
): Promise<PageContext | undefined> {
  if (!context) return undefined;
  const location = getPageLocation(context.pathname);
  const comparison = await resolveComparisonContext(supabase, context, location.route);
  const resolved: PageContext = {
    pathname: context.pathname,
    search: context.search,
    route: location.route,
    identifier: location.identifier,
    entityType: location.entityType,
    entitySlug: location.slug,
    serverResolved: true,
    ...(comparison ? { comparison } : { comparison: undefined }),
  };
  if (!location.slug || !location.entityType) return resolved;

  let row: Row | null = null;
  if (location.entityType === "product") {
    const { data } = await supabase.from("products").select("id,name,slug,brand,type").eq("slug", location.slug).maybeSingle();
    row = data ? asRow(data) : null;
  } else if (location.entityType === "combo" || location.entityType === "build") {
    const table = location.entityType === "combo" ? "combos" : "builds";
    const select = location.entityType === "combo"
      ? "id,title,slug,category,custom_price_cpu_usd,custom_price_cpu_eur,custom_price_gpu_usd,custom_price_gpu_eur,custom_price_ram_usd,custom_price_ram_eur,cpu:products!cpu_id(id,name),gpu:products!gpu_id(id,name),ram:products!ram_id(id,name)"
      : "id,title,slug,category,custom_price_cpu_usd,custom_price_cpu_eur,custom_price_gpu_usd,custom_price_gpu_eur,custom_price_ram_usd,custom_price_ram_eur,custom_price_motherboard_usd,custom_price_motherboard_eur,custom_price_storage_usd,custom_price_storage_eur,custom_price_psu_usd,custom_price_psu_eur,cpu:products!cpu_id(id,name),gpu:products!gpu_id(id,name),ram:products!ram_id(id,name),motherboard:products!motherboard_id(id,name),storage:products!storage_id(id,name),psu:products!psu_id(id,name)";
    const { data } = await supabase.from(table).select(select).eq("slug", location.slug).eq("is_active", true).maybeSingle();
    row = data ? asRow(data) : null;
  } else if (!isAnonymous && location.savedTable) {
    const select = location.savedTable === "created_combos"
      ? "id,title,slug,category,custom_price_cpu_usd,custom_price_cpu_eur,custom_price_gpu_usd,custom_price_gpu_eur,custom_price_ram_usd,custom_price_ram_eur,cpu:products!cpu_id(id,name),gpu:products!gpu_id(id,name),ram:products!ram_id(id,name)"
      : "id,title,slug,category,custom_price_cpu_usd,custom_price_cpu_eur,custom_price_gpu_usd,custom_price_gpu_eur,custom_price_ram_usd,custom_price_ram_eur,custom_price_motherboard_usd,custom_price_motherboard_eur,custom_price_storage_usd,custom_price_storage_eur,custom_price_psu_usd,custom_price_psu_eur,cpu:products!cpu_id(id,name),gpu:products!gpu_id(id,name),ram:products!ram_id(id,name),motherboard:products!motherboard_id(id,name),storage:products!storage_id(id,name),psu:products!psu_id(id,name)";
    const { data } = await supabase.from(location.savedTable).select(select).eq("slug", location.slug).eq("user_id", userId).maybeSingle();
    row = data ? asRow(data) : null;
  }

  if (!row) return resolved;
  const slots = location.entityType === "product" || location.entityType === "combo" || location.entityType === "saved_combo"
    ? ["cpu", "gpu", "ram"]
    : ["cpu", "gpu", "ram", "motherboard", "storage", "psu"];
  const title = location.entityType === "product" ? asText(row.name) : asText(row.title);
  return {
    ...resolved,
    entityId: asText(row.id) || undefined,
    entityTitle: title || undefined,
    entitySummary: getEntitySummary(row, slots),
    entityComponents: getEntityComponents(row, slots),
  };
}

export function formatPageContextForPrompt(context: PageContext | undefined): string {
  if (!context) return "";
  const trustedEntityTitle = context.serverResolved ? context.entityTitle : undefined;
  const trustedEntitySummary = context.serverResolved ? context.entitySummary : undefined;
  const location = trustedEntityTitle
    ? `Está viendo ${context.entityType === "product" ? "el componente" : context.entityType === "combo" || context.entityType === "saved_combo" ? "el combo" : "la build"} «${trustedEntityTitle}».`
    : `Está en la sección «${context.route || "otra"}» de CoreXScoring.`;
  const summary = trustedEntitySummary ? ` Componentes visibles: ${trustedEntitySummary}.` : "";
  const comparison = context.comparison?.itemIds.length
    ? ` La comparación actual contiene ${context.comparison.itemIds.length} componente(s) de catálogo. Si el usuario se refiere a «estos», «el primero» o «el segundo», consulta get_current_comparison antes de responder.`
    : "";
  return `\n\nContexto actual de la página (dato verificado por el servidor): ${location}${summary}${comparison} Si la pregunta se refiere a «esto», «este componente», «esta build» o «este combo», usa este contexto como referencia y consulta la tool adecuada para obtener detalles completos.`;
}
