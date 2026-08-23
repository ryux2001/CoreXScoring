import type { AiSupabaseClient } from "./tools/types";
import type { PageContext, PageEntityType, PageRoute } from "./types";

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

export async function resolvePageContext(
  supabase: AiSupabaseClient,
  context: PageContext | undefined,
  userId: string,
  isAnonymous: boolean,
): Promise<PageContext | undefined> {
  if (!context) return undefined;
  const location = getPageLocation(context.pathname);
  const resolved: PageContext = {
    ...context,
    route: location.route,
    identifier: location.identifier || context.identifier,
    entityType: location.entityType,
    entitySlug: location.slug,
  };
  if (!location.slug || !location.entityType) return resolved;

  let row: Row | null = null;
  if (location.entityType === "product") {
    const { data } = await supabase.from("products").select("id,name,slug,brand,type").eq("slug", location.slug).maybeSingle();
    row = data ? asRow(data) : null;
  } else if (location.entityType === "combo" || location.entityType === "build") {
    const table = location.entityType === "combo" ? "combos" : "builds";
    const select = location.entityType === "combo"
      ? "id,title,slug,category,cpu:products!cpu_id(name),gpu:products!gpu_id(name),ram:products!ram_id(name)"
      : "id,title,slug,category,cpu:products!cpu_id(name),gpu:products!gpu_id(name),ram:products!ram_id(name),motherboard:products!motherboard_id(name),storage:products!storage_id(name),psu:products!psu_id(name)";
    const { data } = await supabase.from(table).select(select).eq("slug", location.slug).eq("is_active", true).maybeSingle();
    row = data ? asRow(data) : null;
  } else if (!isAnonymous && location.savedTable) {
    const select = location.savedTable === "created_combos"
      ? "id,title,slug,category,cpu:products!cpu_id(name),gpu:products!gpu_id(name),ram:products!ram_id(name)"
      : "id,title,slug,category,cpu:products!cpu_id(name),gpu:products!gpu_id(name),ram:products!ram_id(name),motherboard:products!motherboard_id(name),storage:products!storage_id(name),psu:products!psu_id(name)";
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
    entityTitle: title || context.entityTitle || context.title,
    entitySummary: getEntitySummary(row, slots),
  };
}

export function formatPageContextForPrompt(context: PageContext | undefined): string {
  if (!context) return "";
  const location = context.entityTitle
    ? `Está viendo ${context.entityType === "product" ? "el componente" : context.entityType === "combo" || context.entityType === "saved_combo" ? "el combo" : "la build"} «${context.entityTitle}».`
    : `Está en la sección «${context.route || "otra"}» de CoreXScoring.`;
  const summary = context.entitySummary ? ` Componentes visibles: ${context.entitySummary}.` : "";
  return `\n\nContexto actual de la página (dato verificado por el servidor): ${location}${summary} Si la pregunta se refiere a «esto», «este componente», «esta build» o «este combo», usa este contexto como referencia y consulta la tool adecuada para obtener detalles completos.`;
}
