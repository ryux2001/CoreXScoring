import { getComboNotes, getComboPartPrice } from "@/lib/scoring/combos";
import { getComponentNotes } from "@/lib/scoring/components";
import { getBuildNotes, getBuildPartPrice } from "@/lib/scoring/builds";
import { getProductMetrics } from "@/lib/metricsProducts";
import { calculateCatalogPriceEvaluation, isCatalogValueProfile } from "@/lib/catalog/price-evaluation";
import { convertPrice, isCurrency } from "@/lib/currency";
import type { ComparisonUiAction, PageContext } from "../types";
import type { AiToolContext, AiToolResult } from "./types";

type Row = Record<string, unknown>;
type Currency = "USD" | "EUR";

const PRODUCT_SELECT = [
  "id",
  "slug",
  "market_segment",
  "name",
  "brand",
  "type",
  "category",
  "description",
  "price_base_usd",
  "price_base_eur",
  "release_date",
  "release_year",
  "compatibility",
  "specs",
  "technologies",
  "benchmarks",
  "tags",
].join(", ");

const COMBO_SELECT = [
  "id",
  "title",
  "slug",
  "category",
  "is_active",
  "cpu_id",
  "gpu_id",
  "ram_id",
  "custom_price_cpu_usd",
  "custom_price_cpu_eur",
  "custom_price_gpu_usd",
  "custom_price_gpu_eur",
  "custom_price_ram_usd",
  "custom_price_ram_eur",
  `cpu:products!cpu_id(${PRODUCT_SELECT})`,
  `gpu:products!gpu_id(${PRODUCT_SELECT})`,
  `ram:products!ram_id(${PRODUCT_SELECT})`,
].join(", ");

const BUILD_SELECT = [
  "id",
  "title",
  "slug",
  "category",
  "is_active",
  "cpu_id",
  "gpu_id",
  "ram_id",
  "motherboard_id",
  "storage_id",
  "psu_id",
  "custom_price_cpu_usd",
  "custom_price_cpu_eur",
  "custom_price_gpu_usd",
  "custom_price_gpu_eur",
  "custom_price_ram_usd",
  "custom_price_ram_eur",
  "custom_price_motherboard_usd",
  "custom_price_motherboard_eur",
  "custom_price_storage_usd",
  "custom_price_storage_eur",
  "custom_price_psu_usd",
  "custom_price_psu_eur",
  `cpu:products!cpu_id(${PRODUCT_SELECT})`,
  `gpu:products!gpu_id(${PRODUCT_SELECT})`,
  `ram:products!ram_id(${PRODUCT_SELECT})`,
  `motherboard:products!motherboard_id(${PRODUCT_SELECT})`,
  `storage:products!storage_id(${PRODUCT_SELECT})`,
  `psu:products!psu_id(${PRODUCT_SELECT})`,
].join(", ");

const COMPONENT_TYPES = new Set(["cpu", "gpu", "ram", "storage", "motherboard", "psu"]);
const USE_CASES = new Set(["gaming", "productivity", "balanced"]);

function asRow(value: unknown): Row {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Row
    : {};
}

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? value.map(asRow) : [];
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundNumber(value: number): number {
  return Number(value.toFixed(1));
}

function roundRecord(value: Record<string, unknown>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, asNumber(item)])
      .filter((entry): entry is [string, number] => entry[1] !== null)
      .map(([key, item]) => [key, roundNumber(item)]),
  );
}

function getCurrency(value: unknown): Currency {
  return value === "EUR" ? "EUR" : "USD";
}

function getLimit(value: unknown, fallback: number, maximum: number): number {
  const number = asNumber(value);
  return Math.max(1, Math.min(maximum, Math.floor(number ?? fallback)));
}

function sanitizeSearch(value: unknown): string {
  return asText(value)
    .trim()
    .slice(0, 80)
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeIdentifier(value: unknown): string {
  return asText(value).trim().slice(0, 120);
}

function getObject(value: unknown): Row {
  return asRow(value);
}

function pickObjectValues(value: unknown, keys: string[]): Row {
  const record = getObject(value);
  return Object.fromEntries(
    keys
      .filter((key) => record[key] !== undefined && record[key] !== null)
      .map((key) => [key, record[key]]),
  );
}

function getVerifiedPriceOverride(product: Row, currency: Currency, priceContext?: AiToolContext["priceContext"]): number | null {
  const productId = asText(product.id);
  const item = priceContext?.items.find((candidate) => candidate.productId === productId);
  if (!item || !item.isCustom) return null;
  return roundNumber(priceContext!.currency === currency
    ? item.price
    : convertPrice(item.price, priceContext!.currency, currency));
}

function getProductSummary(product: Row, currency: Currency = "USD", priceContext?: AiToolContext["priceContext"]): Row {
  const type = asText(product.type).toUpperCase();
  const priceUsd = asNumber(product.price_base_usd);
  const priceEur = asNumber(product.price_base_eur);
  const customPrice = getVerifiedPriceOverride(product, currency, priceContext);
  const selectedPrice = customPrice ?? (currency === "EUR" ? priceEur ?? priceUsd ?? 0 : priceUsd ?? priceEur ?? 0);
  // Component quality/price notes always use USD. Un precio personalizado se
  // convierte desde la moneda visible antes de recalcular la valoración.
  const evaluatedPrice = customPrice === null
    ? priceUsd ?? priceEur ?? 0
    : convertPrice(customPrice, currency, "USD");
  let notes: Record<string, number> = {};

  try {
    notes = roundRecord(getComponentNotes(product, evaluatedPrice));
  } catch {
    // A malformed JSONB row must not make the entire AI request fail.
  }

  let metrics: Row[] = [];
  try {
    metrics = getProductMetrics(product)
      .filter((metric) => metric.value > 0)
      .map((metric) => ({
        label: metric.label,
        unit: metric.unit,
        value: roundNumber(metric.value),
      }));
  } catch {
    // Metrics are supplementary; the raw product summary remains useful.
  }

  const specs = pickObjectValues(product.specs, [
    "socket",
    "cores",
    "threads",
    "tdp",
    "vram_capacity",
    "vram_type",
    "bus_width",
    "speed",
    "capacity",
    "memory_type",
    "read_speed",
    "write_speed",
    "wattage",
    "form_factor",
    "chipset",
    "pcie_generation",
  ]);

  return {
    source: "CoreXScoring · catálogo interno",
    id: asText(product.id),
    slug: asText(product.slug),
    name: asText(product.name),
    brand: asText(product.brand),
    type,
    category: asText(product.category),
    description: asText(product.description).slice(0, 600),
    prices: { USD: priceUsd, EUR: priceEur },
    selectedPrice: { currency, value: selectedPrice },
    priceSource: customPrice === null ? "base" : "frontend_custom_verified",
    releaseDate: product.release_date ?? null,
    specs,
    compatibility: pickObjectValues(product.compatibility, [
      "socket",
      "chipset",
      "pcie_generation",
      "memory_type",
      "ram_type",
      "ram_max_capacity",
      "power_connectors",
      "connector",
      "interface",
      "form_factor",
    ]),
    technologies: Array.isArray(product.technologies)
      ? product.technologies.slice(0, 8)
      : [],
    benchmarks: pickObjectValues(product.benchmarks, [
      "3dmark_time_spy",
      "3dmark_port_royal",
      "1080p_gaming_avg_fps",
      "1440p_gaming_avg_fps",
      "4k_gaming_avg_fps",
      "cinebench_multi",
      "geekbench_single",
      "passmark_score",
    ]),
    tags: Array.isArray(product.tags) ? product.tags.slice(0, 12) : [],
    scoring: notes,
    metrics,
  };
}

function getComponentIdentity(value: unknown): Row | null {
  const product = asRow(value);
  if (!product.id && !product.name) return null;

  return {
    id: asText(product.id),
    slug: asText(product.slug),
    name: asText(product.name),
    brand: asText(product.brand),
    type: asText(product.type).toUpperCase(),
  };
}

function getPartPrice(record: Row, part: string, currency: Currency): number {
  try {
    return roundNumber(getBuildPartPrice(record, part, currency));
  } catch {
    return 0;
  }
}

function summarizeCombo(combo: Row, currency: Currency): Row {
  let scoring: Row = {};
  try {
    scoring = getComboNotes(combo, currency) as unknown as Row;
  } catch {
    // Incomplete combos still return their component identities below.
  }

  const parts = ["cpu", "gpu", "ram"].map((part) => {
    const product = asRow(combo[part]);
    let price = 0;
    try {
      price = roundNumber(getComboPartPrice(combo, part as "cpu" | "gpu" | "ram", currency));
    } catch {
      price = 0;
    }

    return {
      part,
      component: getComponentIdentity(product),
      price,
    };
  });

  return {
    source: "CoreXScoring · combos públicos",
    id: asText(combo.id),
    slug: asText(combo.slug),
    title: asText(combo.title),
    category: asText(combo.category),
    active: combo.is_active === true,
    currency,
    parts,
    totalPrice: roundNumber(parts.reduce((total, part) => total + part.price, 0)),
    scoring: roundRecord(scoring),
  };
}

function summarizeBuild(build: Row, currency: Currency): Row {
  let scoring: Row = {};
  try {
    scoring = getBuildNotes(build, currency) as unknown as Row;
  } catch {
    // Incomplete builds still return their component identities below.
  }

  const partNames = ["cpu", "gpu", "ram", "motherboard", "storage", "psu"];
  const parts = partNames.map((part) => ({
    part,
    component: getComponentIdentity(build[part]),
    price: getPartPrice(build, part, currency),
  }));

  return {
    source: "CoreXScoring · builds públicas",
    id: asText(build.id),
    slug: asText(build.slug),
    title: asText(build.title),
    category: asText(build.category),
    active: build.is_active === true,
    currency,
    parts,
    totalPrice: roundNumber(parts.reduce((total, part) => total + part.price, 0)),
    scoring: roundRecord(scoring),
  };
}

function getToolSuccess(data: unknown): AiToolResult {
  return { ok: true, data };
}

function getToolFailure(error: string): AiToolResult {
  return { ok: false, error };
}

function getLatestContext(context: PageContext | undefined): Row {
  if (!context) {
    return {
      available: false,
      message: "No se recibió contexto de página en esta petición.",
    };
  }

  return {
    available: true,
    pathname: context.pathname,
    search: context.search || "",
    title: context.title || "",
    route: context.route,
    identifier: context.identifier ?? null,
    entityType: context.entityType ?? null,
    entityId: context.entityId ?? null,
    entitySlug: context.entitySlug ?? null,
    entityTitle: context.entityTitle ?? null,
    entitySummary: context.entitySummary ?? null,
  };
}

function normalizePageRoute(pathname: string): Pick<PageContext, "route" | "identifier"> {
  const segments = pathname.split("/").filter(Boolean);
  const [root, identifier] = segments;
  if (!root) return { route: "home" };

  const routeMap: Record<string, PageContext["route"]> = {
    catalog: "catalog",
    combos: "combo",
    builds: "build",
    comparator: "comparator",
    vault: "vault",
  };

  return {
    route: routeMap[root] ?? "other",
    identifier: identifier || undefined,
  };
}

function getProductQuery(client: AiToolContext["supabase"]) {
  return client.from("products").select(PRODUCT_SELECT);
}

function getActiveComboQuery(client: AiToolContext["supabase"]) {
  return client.from("combos").select(COMBO_SELECT).eq("is_active", true);
}

function getActiveBuildQuery(client: AiToolContext["supabase"]) {
  return client.from("builds").select(BUILD_SELECT).eq("is_active", true);
}

/** Tool: busca componentes con filtros acotados y devuelve solo campos útiles para razonar. */
export async function searchComponents(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  const queryText = sanitizeSearch(input.query);
  const type = sanitizeSearch(input.type).toLowerCase();
  const limit = getLimit(input.limit, 5, 8);

  if (type && !COMPONENT_TYPES.has(type)) return getToolFailure("El tipo de componente no está permitido.");

  let query = context.supabase
    .from("products_with_priority")
    .select(PRODUCT_SELECT)
    .order("priority", { ascending: true })
    .order("release_date", { ascending: false })
    .limit(limit);

  if (queryText) {
    query = query.or(`name.ilike.*${queryText}*,brand.ilike.*${queryText}*,slug.ilike.*${queryText}*`);
  }
  if (type) query = query.eq("type", type);

  const minPrice = asNumber(input.minPriceUsd);
  const maxPrice = asNumber(input.maxPriceUsd);
  if (minPrice !== null && minPrice >= 0) query = query.gte("price_base_usd", minPrice);
  if (maxPrice !== null && maxPrice >= 0) query = query.lte("price_base_usd", maxPrice);

  const { data, error } = await query;
  if (error) return getToolFailure("No se pudo consultar el catálogo de componentes.");

  return getToolSuccess({
    query: queryText || null,
    count: asRows(data).length,
    components: asRows(data).map((product) => getProductSummary(product)),
  });
}

/** Tool: obtiene un componente exacto por id/slug o una coincidencia controlada por nombre. */
export async function getComponent(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  const id = sanitizeIdentifier(input.id);
  const slug = sanitizeIdentifier(input.slug);
  const name = sanitizeSearch(input.name);

  if (!id && !slug && !name) return getToolFailure("Debes indicar id, slug o nombre del componente.");

  let query = getProductQuery(context.supabase).limit(1);
  if (id) query = query.eq("id", id);
  else if (slug) query = query.eq("slug", slug);
  else query = query.ilike("name", `%${name}%`);

  const { data, error } = await query.maybeSingle();
  if (error) return getToolFailure("No se pudo consultar el componente solicitado.");
  if (!data) return getToolFailure("No encontré un componente con ese identificador.");

  return getToolSuccess({ component: getProductSummary(asRow(data)) });
}

/** Tool: compara componentes existentes y calcula un ranking explicable con sus notas internas. */
export async function compareComponents(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  const ids = Array.isArray(input.componentIds)
    ? input.componentIds.map(sanitizeIdentifier).filter(Boolean).slice(0, 4)
    : [];
  const currency = getCurrency(input.currency);

  if (ids.length < 2) return getToolFailure("Necesito al menos dos IDs de componentes para comparar.");

  const { data, error } = await getProductQuery(context.supabase).in("id", ids);
  if (error) return getToolFailure("No se pudieron consultar los componentes para la comparación.");

  const components = asRows(data).map((product) => getProductSummary(product, currency, context.priceContext));
  if (components.length < 2) return getToolFailure("No encontré suficientes componentes válidos para comparar.");

  const ranked = [...components].sort((left, right) => {
    const leftScore = asNumber(getObject(left.scoring).Gaming) ?? 0;
    const rightScore = asNumber(getObject(right.scoring).Gaming) ?? 0;
    return rightScore - leftScore;
  });

  return getToolSuccess({
    currency,
    requestedIds: ids,
    foundCount: components.length,
    components,
    rankingByGamingScore: ranked.map((component, index) => ({
      position: index + 1,
      id: component.id,
      name: component.name,
      gamingScore: getObject(component.scoring).Gaming ?? null,
    })),
  });
}

/** Tool: busca combos públicos activos por texto y calcula su resumen de scoring. */
export async function searchCombos(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  const queryText = sanitizeSearch(input.query);
  const limit = getLimit(input.limit, 4, 6);
  let query = getActiveComboQuery(context.supabase).order("created_at", { ascending: false }).limit(limit);

  if (queryText) query = query.or(`title.ilike.*${queryText}*,slug.ilike.*${queryText}*,category.ilike.*${queryText}*`);

  const { data, error } = await query;
  if (error) return getToolFailure("No se pudieron consultar los combos.");

  return getToolSuccess({
    query: queryText || null,
    combos: asRows(data).map((combo) => summarizeCombo(combo, "USD")),
  });
}

/** Tool: obtiene un combo completo por id o slug y sus notas calculadas. */
export async function getCombo(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  const id = sanitizeIdentifier(input.id);
  const slug = sanitizeIdentifier(input.slug);
  const currency = getCurrency(input.currency);
  if (!id && !slug) return getToolFailure("Debes indicar id o slug del combo.");

  let query = getActiveComboQuery(context.supabase).limit(1);
  query = id ? query.eq("id", id) : query.eq("slug", slug);
  const { data, error } = await query.maybeSingle();
  if (error) return getToolFailure("No se pudo consultar el combo solicitado.");
  if (!data) return getToolFailure("No encontré un combo activo con ese identificador.");

  return getToolSuccess({ combo: summarizeCombo(asRow(data), currency) });
}

/** Tool: busca builds públicas activas por texto y calcula su resumen de scoring. */
export async function searchBuilds(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  const queryText = sanitizeSearch(input.query);
  const limit = getLimit(input.limit, 4, 6);
  let query = getActiveBuildQuery(context.supabase).order("created_at", { ascending: false }).limit(limit);

  if (queryText) query = query.or(`title.ilike.*${queryText}*,slug.ilike.*${queryText}*,category.ilike.*${queryText}*`);

  const { data, error } = await query;
  if (error) return getToolFailure("No se pudieron consultar las builds.");

  return getToolSuccess({
    query: queryText || null,
    builds: asRows(data).map((build) => summarizeBuild(build, "USD")),
  });
}

/** Tool: obtiene una build completa por id o slug, incluyendo compatibilidad y scoring. */
export async function getBuild(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  const id = sanitizeIdentifier(input.id);
  const slug = sanitizeIdentifier(input.slug);
  const currency = getCurrency(input.currency);
  if (!id && !slug) return getToolFailure("Debes indicar id o slug de la build.");

  let query = getActiveBuildQuery(context.supabase).limit(1);
  query = id ? query.eq("id", id) : query.eq("slug", slug);
  const { data, error } = await query.maybeSingle();
  if (error) return getToolFailure("No se pudo consultar la build solicitada.");
  if (!data) return getToolFailure("No encontré una build activa con ese identificador.");

  return getToolSuccess({ build: summarizeBuild(asRow(data), currency) });
}

/** Tool compuesta de solo lectura: obtiene una build y sus datos para opinar sobre ella. */
export async function analyzeBuild(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const result = await getBuild(args, context);
  if (!result.ok) return result;
  return {
    ok: true,
    data: {
      analysisType: "build_review",
      instruction: "Analiza únicamente los datos devueltos por CoreXScoring; no modifiques ni propongas guardar la build.",
      ...asRow(result.data),
    },
  };
}

/** Tool: recomienda candidatos reales ordenados por caso de uso y presupuesto, sin modificar datos. */
export async function recommendComponents(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  const type = sanitizeSearch(input.type).toLowerCase();
  const useCase = sanitizeSearch(input.useCase).toLowerCase() || "balanced";
  const limit = getLimit(input.limit, 3, 5);
  const maxPriceUsd = asNumber(input.maxPriceUsd);

  if (!COMPONENT_TYPES.has(type)) return getToolFailure("Debes indicar un tipo de componente permitido.");
  if (!USE_CASES.has(useCase)) return getToolFailure("El caso de uso no está permitido.");

  let query = context.supabase
    .from("products_with_priority")
    .select(PRODUCT_SELECT)
    .eq("type", type)
    .order("priority", { ascending: true })
    .limit(40);
  if (maxPriceUsd !== null && maxPriceUsd >= 0) query = query.lte("price_base_usd", maxPriceUsd);

  const { data, error } = await query;
  if (error) return getToolFailure("No se pudo consultar el catálogo para recomendar componentes.");

  const candidates = asRows(data).map((product) => {
    const summary = getProductSummary(product);
    const scoring = getObject(summary.scoring);
    const gaming = asNumber(scoring.Gaming) ?? 0;
    const productivity = asNumber(scoring.Productividad) ?? 0;
    const value = asNumber(scoring["Calidad precio"] ?? scoring["Calidad Precio"]) ?? 0;
    const primary = useCase === "gaming" ? gaming : useCase === "productivity" ? productivity : (gaming + productivity) / 2;
    const recommendationScore = roundNumber(primary * 0.7 + value * 0.3);
    return { ...summary, recommendationScore, recommendationBasis: { primary: roundNumber(primary), value: roundNumber(value) } };
  });

  candidates.sort((left, right) => right.recommendationScore - left.recommendationScore);
  return getToolSuccess({
    type: type.toUpperCase(),
    useCase,
    maxPriceUsd: maxPriceUsd ?? null,
    candidates: candidates.slice(0, limit),
    note: "El orden combina 70% de la nota principal del caso de uso y 30% de calidad-precio calculadas por CoreXScoring.",
  });
}

/** Tool: devuelve el contexto de ruta enviado por la interfaz sin acceder a datos sensibles del navegador. */
export async function getCurrentPageContext(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  void args;
  const pageContext = context.pageContext;
  if (!pageContext) return getToolSuccess(getLatestContext(undefined));
  return getToolSuccess({
    ...getLatestContext(pageContext),
    route: pageContext.route || normalizePageRoute(pageContext.pathname).route,
    identifier: pageContext.identifier || normalizePageRoute(pageContext.pathname).identifier || null,
  });
}

/** Tool: lee la comparación local actual usando únicamente IDs verificados por el servidor. */
export async function getCurrentComparison(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  void args;
  const pageContext = context.pageContext;
  const itemIds = pageContext?.route === "comparator" ? pageContext.comparison?.itemIds || [] : [];
  if (itemIds.length === 0) return getToolFailure("No hay componentes de catálogo en la comparación actual.");

  const currency = getCurrency(new URLSearchParams(pageContext?.search || "").get("currency"));
  const { data, error } = await getProductQuery(context.supabase).in("id", itemIds);
  if (error) return getToolFailure("No se pudo consultar la comparación actual.");

  const productsById = new Map(asRows(data).map((product) => [asText(product.id), product]));
  const components = itemIds
    .map((id) => productsById.get(id))
    .filter((product): product is Row => Boolean(product))
    .map((product) => getProductSummary(product, currency, context.priceContext));

  if (components.length < itemIds.length) return getToolFailure("Uno de los componentes de la comparación ya no está disponible.");

  return getToolSuccess({
    currency,
    count: components.length,
    components,
    note: "Estos datos proceden de la comparación local actual y fueron reconsultados por el servidor.",
  });
}

function getComparisonIds(context: AiToolContext): string[] {
  return context.pageContext?.route === "comparator"
    ? context.pageContext.comparison?.itemIds || []
    : [];
}

/** Tool: prepara una acción local para añadir un producto ya resuelto al comparador. */
export async function proposeAddToComparison(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  const itemId = sanitizeIdentifier(input.id);
  const currentIds = getComparisonIds(context);
  if (!context.pageContext || context.pageContext.route !== "comparator") {
    return getToolFailure("Abre el comparador para poder añadir un componente.");
  }
  if (!itemId) return getToolFailure("Falta el ID del componente que quieres añadir.");
  if (currentIds.includes(itemId)) return getToolFailure("Ese componente ya está en la comparación.");
  if (currentIds.length >= 3) return getToolFailure("La comparación ya tiene tres componentes.");

  const { data: currentProducts, error: currentError } = await getProductQuery(context.supabase).in("id", currentIds);
  if (currentError) return getToolFailure("No pude validar los componentes actuales de la comparación.");

  const currentTypes = new Set(asRows(currentProducts).map((product) => asText(product.type).toLowerCase()).filter(Boolean));
  if (currentTypes.size > 1) return getToolFailure("La comparación actual contiene tipos incompatibles; corrígela desde la interfaz antes de añadir otro componente.");

  const { data: product, error } = await context.supabase
    .from("products_with_priority")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !product) return getToolFailure("No encontré ese componente en el catálogo.");

  const productRow = asRow(product);
  const productType = asText(productRow.type).toLowerCase();
  if (!COMPONENT_TYPES.has(productType)) return getToolFailure("El producto seleccionado no es un componente comparable.");
  if (currentTypes.size === 1 && !currentTypes.has(productType)) {
    return getToolFailure(`No puedes mezclar ${productType.toUpperCase()} con ${[...currentTypes][0].toUpperCase()} en esta comparación.`);
  }

  const currency = getCurrency(new URLSearchParams(context.pageContext.search || "").get("currency"));
  const selectedPrice = currency === "EUR" ? asNumber(productRow.price_base_eur) ?? asNumber(productRow.price_base_usd) ?? 0 : asNumber(productRow.price_base_usd) ?? asNumber(productRow.price_base_eur) ?? 0;
  const action: ComparisonUiAction = {
    type: "add",
    itemId,
    itemName: asText(productRow.name, "el componente"),
    item: {
      ...productRow,
      comparisonType: "product",
      price: selectedPrice,
      currency,
    },
  };
  return {
    ok: true,
    data: { status: "ready", message: `He preparado ${action.itemName} para añadirlo a la comparación.` },
    comparisonAction: action,
  };
}

/** Tool: prepara una acción local para quitar un producto que sigue en la comparación. */
export async function proposeRemoveFromComparison(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const itemId = sanitizeIdentifier(asRow(args).id);
  const currentIds = getComparisonIds(context);
  if (!context.pageContext || context.pageContext.route !== "comparator") {
    return getToolFailure("Abre el comparador para poder quitar un componente.");
  }
  if (!itemId || !currentIds.includes(itemId)) return getToolFailure("Ese componente no está en la comparación actual.");

  const { data: product, error } = await getProductQuery(context.supabase).eq("id", itemId).maybeSingle();
  if (error || !product) return getToolFailure("No pude validar el componente que quieres quitar.");

  const productName = asText(asRow(product).name, "el componente");
  return {
    ok: true,
    data: { status: "ready", message: `He preparado la eliminación de ${productName} de la comparación.` },
    comparisonAction: { type: "remove", itemId, itemName: productName },
  };
}

/** Tool: prepara un precio temporal para un componente que ya está en la comparación. */
export async function proposeSetComparisonPrice(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  const itemId = sanitizeIdentifier(input.id);
  const pageContext = context.pageContext;
  const currentIds = getComparisonIds(context);
  if (!pageContext || pageContext.route !== "comparator") {
    return getToolFailure("Abre el comparador para poder personalizar un precio.");
  }
  if (!itemId || !currentIds.includes(itemId)) {
    return getToolFailure("Ese componente no está en la comparación actual.");
  }

  const price = Number(input.price);
  const pageCurrency = getCurrency(new URLSearchParams(pageContext.search || "").get("currency"));
  const requestedCurrency = input.currency === undefined
    ? null
    : isCurrency(input.currency) ? input.currency.toUpperCase() as Currency : null;
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000 || (input.currency !== undefined && !requestedCurrency)) {
    return getToolFailure("Indica un precio positivo y una moneda válida.");
  }
  if (requestedCurrency && requestedCurrency !== pageCurrency) {
    return getToolFailure(`El comparador está mostrando precios en ${pageCurrency}. Usa esa moneda para personalizar este precio.`);
  }

  const { data: product, error } = await getProductQuery(context.supabase).eq("id", itemId).maybeSingle();
  if (error || !product) return getToolFailure("No pude validar el componente de la comparación.");

  const productRow = asRow(product);
  const productType = asText(productRow.type).toLowerCase();
  if (!COMPONENT_TYPES.has(productType)) return getToolFailure("Solo se pueden personalizar precios de componentes de catálogo.");

  const normalizedPrice = Number(price.toFixed(2));
  return {
    ok: true,
    data: {
      status: "ready",
      message: `He preparado ${asText(productRow.name, "el componente")} a ${normalizedPrice} ${pageCurrency}.`,
    },
    comparisonAction: {
      type: "set_price",
      itemId,
      itemName: asText(productRow.name, "el componente"),
      price: normalizedPrice,
      currency: pageCurrency,
    },
  };
}

/** Tool de escritura local: recalcula el precio de la ficha actual sin tocar el catálogo. */
export async function setCurrentCatalogPrice(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  const pageContext = context.pageContext;
  if (!pageContext || pageContext.entityType !== "product" || !pageContext.entityId) {
    return { ok: false, error: "Esta acción solo está disponible dentro de la ficha de un componente." };
  }

  const price = Number(input.price);
  const pageCurrency = new URLSearchParams(pageContext.search ?? "").get("currency");
  const requestedCurrency = input.currency === undefined
    ? null
    : isCurrency(input.currency) ? input.currency.toUpperCase() as Currency : null;
  const currency = requestedCurrency || (pageCurrency && isCurrency(pageCurrency) ? pageCurrency.toUpperCase() as Currency : "USD");
  const valueProfile = input.valueProfile === undefined || isCatalogValueProfile(input.valueProfile)
    ? input.valueProfile as "balanced" | "gaming" | "creation" | "productivity" | undefined
    : null;
  if ((input.currency !== undefined && !requestedCurrency) || valueProfile === null || !Number.isFinite(price) || price <= 0 || price > 1_000_000) {
    return { ok: false, error: "Indica un precio positivo, una moneda válida y, si corresponde, un perfil de valoración válido." };
  }
  if (requestedCurrency && pageCurrency && isCurrency(pageCurrency) && pageCurrency.toUpperCase() !== currency) {
    return { ok: false, error: `La ficha está mostrando precios en ${pageCurrency.toUpperCase()}. Usa esa moneda para actualizar la evaluación visible.` };
  }

  const { data, error } = await context.supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", pageContext.entityId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "No pude validar el componente que estás viendo." };

  const evaluation = calculateCatalogPriceEvaluation({
    product: asRow(data),
    productId: pageContext.entityId,
    price: Number(price.toFixed(2)),
    currency,
    valueProfile,
    source: "chat",
  });
  if (!evaluation) return { ok: false, error: "No pude calcular la evaluación para ese precio." };

  const name = asText(asRow(data).name, "este componente");
  return {
    ok: true,
    data: {
      status: "applied",
      message: `He evaluado ${name} a ${evaluation.price} ${evaluation.currency}. Calidad/precio: ${evaluation.qualityPriceScore.toFixed(2)}/10.`,
      instruction: "La interfaz aplicará este precio solo en la evaluación local de la ficha; el precio del catálogo no cambia.",
    },
    catalogPriceEvaluation: evaluation,
    catalogPriceUpdate: evaluation,
  };
}
