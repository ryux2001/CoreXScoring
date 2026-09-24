import { getComboNotes, getComboPartPrice } from "@/lib/scoring/combos";
import { getComponentNotes } from "@/lib/scoring/components";
import { getBuildNotes, getBuildPartPrice } from "@/lib/scoring/builds";
import { getProductMetrics } from "@/lib/metricsProducts";
import { calculateComboFps, type GameData } from "@/lib/fpsCombos";
import { calculateCatalogPriceEvaluation, isCatalogValueProfile } from "@/lib/catalog/price-evaluation";
import { convertPrice, isCurrency } from "@/lib/currency";
import { resolveProductPrice } from "@/lib/catalog/product-price";
import { getComparisonFpsResult, type ComparisonFpsItem } from "@/lib/fpsCombos/comparison";
import type { ComparisonUiAction, PageContext } from "../types";
import type { AiToolContext, AiToolResult } from "./types";
import { AI_PRODUCT_SELECT } from "../privacy";

type Row = Record<string, unknown>;
type Currency = "USD" | "EUR";
type GameResolution = "1080p" | "1440p" | "4k";

const GAME_RESOLUTIONS: GameResolution[] = ["1080p", "1440p", "4k"];
const GAME_PRESETS = new Set(["bajo", "medio", "alto", "ultra"]);
const FPS_CONTEXT_ENTITY_TYPES = new Set(["combo", "build", "saved_combo", "saved_build"]);

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
  `cpu:products!cpu_id(${AI_PRODUCT_SELECT})`,
  `gpu:products!gpu_id(${AI_PRODUCT_SELECT})`,
  `ram:products!ram_id(${AI_PRODUCT_SELECT})`,
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
  `cpu:products!cpu_id(${AI_PRODUCT_SELECT})`,
  `gpu:products!gpu_id(${AI_PRODUCT_SELECT})`,
  `ram:products!ram_id(${AI_PRODUCT_SELECT})`,
  `motherboard:products!motherboard_id(${AI_PRODUCT_SELECT})`,
  `storage:products!storage_id(${AI_PRODUCT_SELECT})`,
  `psu:products!psu_id(${AI_PRODUCT_SELECT})`,
].join(", ");

const COMPONENT_TYPES = new Set(["cpu", "gpu", "ram", "storage", "motherboard", "psu"]);
const USE_CASES = new Set(["gaming", "productivity", "balanced"]);

const GAME_SELECT = [
  "id",
  "slug",
  "name",
  "limite_motor_fps",
  "cpu_score_ideal",
  "ram_minima_gb",
  "vram_minima_gb",
  "gpu_fps_base",
].join(", ");

function asRow(value: unknown): Row {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Row
    : {};
}

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? value.map(asRow) : value && typeof value === "object" ? [asRow(value)] : [];
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

function parseJsonObject(value: unknown): Row {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return asRow(parsed);
    } catch {
      return {};
    }
  }
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
  const usdPrice = resolveProductPrice(product, "USD");
  const eurPrice = resolveProductPrice(product, "EUR");
  const priceUsd = usdPrice.value || null;
  const priceEur = eurPrice.value || null;
  const customPrice = getVerifiedPriceOverride(product, currency, priceContext);
  const selectedPrice = customPrice ?? (currency === "EUR" ? eurPrice.value : usdPrice.value);
  // Component quality/price notes always use USD. Un precio personalizado se
  // convierte desde la moneda visible antes de recalcular la valoración.
  const evaluatedPrice = customPrice === null
    ? usdPrice.value
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

function applyComparisonPartPrices(
  record: Row,
  parts: string[],
  currency: Currency,
  priceContext: AiToolContext["priceContext"],
): Row {
  const effective = { ...record };
  for (const part of parts) {
    const product = asRow(record[part]);
    const customPrice = getVerifiedPriceOverride(product, currency, priceContext);
    if (customPrice === null) continue;
    effective[`custom_price_${part}_${currency.toLowerCase()}`] = customPrice;
    effective[`custom_price_${part}_${currency === "EUR" ? "usd" : "eur"}`] = convertPrice(
      customPrice,
      currency,
      currency === "EUR" ? "USD" : "EUR",
    );
  }
  return effective;
}

function summarizeCombo(combo: Row, currency: Currency, priceContext?: AiToolContext["priceContext"]): Row {
  const effectiveCombo = applyComparisonPartPrices(combo, ["cpu", "gpu", "ram"], currency, priceContext);
  let scoring: Row = {};
  try {
    scoring = getComboNotes(effectiveCombo, currency) as unknown as Row;
  } catch {
    // Incomplete combos still return their component identities below.
  }

  const parts = ["cpu", "gpu", "ram"].map((part) => {
    const product = asRow(effectiveCombo[part]);
    let price = 0;
    try {
      price = roundNumber(getComboPartPrice(effectiveCombo, part as "cpu" | "gpu" | "ram", currency));
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
    id: asText(effectiveCombo.id),
    slug: asText(effectiveCombo.slug),
    title: asText(effectiveCombo.title),
    category: asText(effectiveCombo.category),
    active: effectiveCombo.is_active === true,
    currency,
    parts,
    totalPrice: roundNumber(parts.reduce((total, part) => total + part.price, 0)),
    scoring: roundRecord(scoring),
  };
}

function summarizeBuild(build: Row, currency: Currency, priceContext?: AiToolContext["priceContext"]): Row {
  const effectiveBuild = applyComparisonPartPrices(
    build,
    ["cpu", "gpu", "ram", "motherboard", "storage", "psu"],
    currency,
    priceContext,
  );
  let scoring: Row = {};
  try {
    scoring = getBuildNotes(effectiveBuild, currency) as unknown as Row;
  } catch {
    // Incomplete builds still return their component identities below.
  }

  const partNames = ["cpu", "gpu", "ram", "motherboard", "storage", "psu"];
  const parts = partNames.map((part) => ({
    part,
    component: getComponentIdentity(effectiveBuild[part]),
    price: getPartPrice(effectiveBuild, part, currency),
  }));

  return {
    source: "CoreXScoring · builds públicas",
    id: asText(effectiveBuild.id),
    slug: asText(effectiveBuild.slug),
    title: asText(effectiveBuild.title),
    category: asText(effectiveBuild.category),
    active: effectiveBuild.is_active === true,
    currency,
    parts,
    totalPrice: roundNumber(parts.reduce((total, part) => total + part.price, 0)),
    scoring: roundRecord(scoring),
  };
}

function getScore(record: Row, keys: string[]): number {
  const scoring = asRow(record.scoring);
  for (const key of keys) {
    const value = asNumber(scoring[key]);
    if (value !== null) return value;
  }
  return 0;
}

function getComparisonVerdict(items: Row[], entityType: string): Row | undefined {
  if (items.length < 2) return undefined;
  const performanceKeys = entityType === "build"
    ? ["gaming", "Gaming", "potencia", "Potencia"]
    : ["Gaming", "gaming", "Potencia", "potencia"];
  const valueKeys = entityType === "build"
    ? ["calidadPrecio", "Calidad Precio", "Calidad precio", "Calidad/precio", "qualityPrice"]
    : ["Calidad Precio", "Calidad precio", "Calidad/precio", "calidadPrecio", "qualityPrice"];
  const scored = items.map((item) => {
    const performance = getScore(item, performanceKeys);
    const value = getScore(item, valueKeys);
    return {
      id: asText(item.id),
      name: asText(item.name || item.title, "Elemento"),
      performance,
      value,
      overall: roundNumber(performance * 0.7 + value * 0.3),
    };
  });
  const by = (key: "performance" | "value" | "overall") => [...scored].sort((left, right) => right[key] - left[key]);
  const performanceRanking = by("performance");
  const valueRanking = by("value");
  const overallRanking = by("overall");
  return {
    rule: "70% rendimiento principal + 30% calidad/precio; el precio evaluado vigente tiene prioridad.",
    winnerByPerformance: performanceRanking[0],
    winnerByValue: valueRanking[0],
    winnerOverall: overallRanking[0],
    ranking: overallRanking,
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
  return client.from("products").select(AI_PRODUCT_SELECT);
}

function getGameQuery(client: AiToolContext["supabase"]) {
  return client.from("games").select(GAME_SELECT);
}

function getVisibleFpsGpuIds(context: AiToolContext): string[] {
  const pageContext = context.pageContext;
  if (!pageContext) return [];
  if (pageContext.route === "comparator") {
    const comparisonItems = pageContext.comparison?.items || [];
    return comparisonItems.flatMap((item) => item.entityType === "product"
      ? item.componentType === "gpu" ? [item.id] : []
      : (item.parts || []).filter((part) => part.slot === "gpu").map((part) => part.id));
  }
  if (pageContext.entityType === "product" && pageContext.entityId) {
    return [pageContext.entityId];
  }
  return (pageContext.entityComponents || [])
    .filter((component) => component.slot === "gpu")
    .map((component) => component.id);
}

function getGameData(row: Row): GameData {
  return {
    id: asText(row.id),
    slug: asText(row.slug),
    name: asText(row.name),
    limite_motor_fps: asNumber(row.limite_motor_fps) ?? 0,
    cpu_score_ideal: asNumber(row.cpu_score_ideal) ?? 0,
    ram_minima_gb: asNumber(row.ram_minima_gb) ?? 0,
    vram_minima_gb: asNumber(row.vram_minima_gb) ?? 0,
    gpu_fps_base: parseJsonObject(row.gpu_fps_base) as GameData["gpu_fps_base"],
  };
}

function getBaseGameFps(
  game: GameData,
  gpuId: string,
  resolution: GameResolution,
  preset: string,
): number | null {
  const gpuData = getObject(game.gpu_fps_base[gpuId]);
  const resolutionData = getObject(gpuData[resolution]);
  const fps = asNumber(resolutionData[preset]);
  return fps !== null && fps > 0 ? roundNumber(fps) : null;
}

function getFpsProductSummary(
  product: Row,
  currency: Currency,
  priceContext: AiToolContext["priceContext"],
): Row {
  const summary = getProductSummary(product, currency, priceContext);
  const scoring = getObject(summary.scoring);
  return {
    id: summary.id,
    name: summary.name,
    brand: summary.brand,
    type: summary.type,
    selectedPrice: summary.selectedPrice,
    priceSource: summary.priceSource,
    gamingScore: asNumber(scoring.Gaming) ?? null,
  };
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
    .select(AI_PRODUCT_SELECT)
    .order("priority", { ascending: true })
    .order("release_date", { ascending: false })
    .limit(limit);

  if (queryText) {
    query = query.or(`name.ilike.*${queryText}*,brand.ilike.*${queryText}*,slug.ilike.*${queryText}*`);
  }
  if (type) query = query.eq("type", type);

  const minPrice = asNumber(input.minPriceUsd);
  const maxPrice = asNumber(input.maxPriceUsd);
  if (minPrice !== null && minPrice >= 0) query = query.or(`price_usd.gte.${minPrice},and(price_usd.is.null,price_base_usd.gte.${minPrice})`);
  if (maxPrice !== null && maxPrice >= 0) query = query.or(`price_usd.lte.${maxPrice},and(price_usd.is.null,price_base_usd.lte.${maxPrice})`);

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

async function getComparisonFps(
  input: Row,
  context: AiToolContext,
): Promise<AiToolResult> {
  const pageContext = context.pageContext;
  const comparison = pageContext?.route === "comparator" ? pageContext.comparison : undefined;
  const comparisonItems = comparison?.items || [];
  const itemIds = comparison?.itemIds || [];
  if (itemIds.length === 0 || comparisonItems.length !== itemIds.length) {
    return getToolFailure("La comparación actual está vacía o todavía no está disponible.");
  }

  const entityTypes = new Set(comparisonItems.map((item) => item.entityType));
  if (entityTypes.size !== 1) {
    return getToolFailure("No se pueden comparar FPS entre componentes, combos y builds mezclados.");
  }
  const entityType = [...entityTypes][0];
  const [{ data: products, error: productError }, { data: combos, error: comboError }, { data: builds, error: buildError }] = await Promise.all([
    entityType === "product" ? getProductQuery(context.supabase).in("id", itemIds) : Promise.resolve({ data: [], error: null }),
    entityType === "combo" ? getActiveComboQuery(context.supabase).in("id", itemIds) : Promise.resolve({ data: [], error: null }),
    entityType === "build" ? getActiveBuildQuery(context.supabase).in("id", itemIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (productError || comboError || buildError) return getToolFailure("No se pudo consultar la comparación actual para calcular FPS.");

  const rows = new Map(asRows(entityType === "product" ? products : entityType === "combo" ? combos : builds).map((row) => [asText(row.id), row]));
  const items: ComparisonFpsItem[] = itemIds.flatMap((id) => {
    const row = rows.get(id);
    return row
      ? [{
          ...row,
          id,
          comparisonType: entityType,
          type: entityType === "product" ? asText(row.type) : entityType.toUpperCase(),
        }]
      : [];
  });
  if (items.length !== itemIds.length) return getToolFailure("Uno de los elementos de la comparación ya no está disponible.");

  const gameId = sanitizeIdentifier(input.gameId);
  const gameSlug = sanitizeSearch(input.gameSlug).toLowerCase();
  const gameName = sanitizeSearch(input.gameName);
  if (!gameId && !gameSlug && !gameName) {
    const { data, error } = await context.supabase
      .from("games")
      .select("id,slug,name")
      .order("name", { ascending: true })
      .limit(20);
    if (error) return getToolFailure("No se pudo consultar el catálogo de juegos.");
    const games = asRows(data).map((game) => ({ id: asText(game.id), slug: asText(game.slug), name: asText(game.name) }));
    return {
      ok: true,
      data: { needsGame: true, games, message: "Indica el juego para calcular los FPS de la comparación." },
      finalResponse: "Para comparar los FPS de estas configuraciones necesito el juego. Indícame, por ejemplo, Cyberpunk 2077; mantendré la resolución 4K si ya la has indicado.",
    };
  }

  let gameQuery = getGameQuery(context.supabase).limit(1);
  if (gameId) gameQuery = gameQuery.eq("id", gameId);
  else if (gameSlug) gameQuery = gameQuery.eq("slug", gameSlug);
  else gameQuery = gameQuery.ilike("name", `%${gameName}%`);
  const { data: gameData, error: gameError } = await gameQuery.maybeSingle();
  if (gameError) return getToolFailure("No se pudo consultar el juego solicitado.");
  if (!gameData) return getToolFailure("No encontré ese juego en la base de datos de rendimiento.");

  const game = getGameData(asRow(gameData));
  const preset = GAME_PRESETS.has(sanitizeSearch(input.preset).toLowerCase())
    ? sanitizeSearch(input.preset).toLowerCase()
    : "medio";
  const requestedResolution = sanitizeSearch(input.resolution).toLowerCase() as GameResolution;
  const selectedResolutions = GAME_RESOLUTIONS.includes(requestedResolution) ? [requestedResolution] : GAME_RESOLUTIONS;
  const results = items.map((item) => {
    const fps = Object.fromEntries(selectedResolutions.map((resolution) => [
      resolution,
      getComparisonFpsResult(item, game, preset, resolution),
    ]));
    return {
      id: asText(item.id),
      name: asText(item.name || item.title, "Elemento"),
      fps,
    };
  });
  const rankingResolution = requestedResolution && GAME_RESOLUTIONS.includes(requestedResolution) ? requestedResolution : null;
  const ranking = rankingResolution
    ? [...results]
      .filter((result) => typeof result.fps[rankingResolution] === "number")
      .sort((left, right) => Number(right.fps[rankingResolution]) - Number(left.fps[rankingResolution]))
    : [];
  const winner = ranking[0];
  const second = ranking[1];
  const winnerFps = winner && rankingResolution ? Number(winner.fps[rankingResolution]) : null;
  const secondFps = second && rankingResolution ? Number(second.fps[rankingResolution]) : null;
  const resolutionLabel = rankingResolution === "4k" ? "4K" : rankingResolution || "todas las resoluciones";
  const finalResponse = [
    `FPS en ${resolutionLabel}, preset ${preset}, para ${game.name}:`,
    ...results.map((result) => `- ${result.name}: ${rankingResolution ? `${result.fps[rankingResolution] ?? "sin datos"} FPS` : `${result.fps["1080p"] ?? "sin datos"} / ${result.fps["1440p"] ?? "sin datos"} / ${result.fps["4k"] ?? "sin datos"} FPS (1080p / 1440p / 4K)`}`),
    ...(winner && rankingResolution && winnerFps !== null
      ? [`Ganadora: ${winner.name} con ${winnerFps} FPS${secondFps !== null ? `, ${winnerFps - secondFps} FPS más que la siguiente.` : "."}`]
      : ["Indica una resolución concreta si quieres un ganador único."]),
  ].join("\n");

  return {
    ok: true,
    data: {
      source: "CoreXScoring · games.gpu_fps_base",
      mode: "comparison_estimate",
      entityType,
      game: { id: game.id, slug: game.slug, name: game.name },
      preset,
      resolution: rankingResolution || "all",
      results,
      ranking,
    },
    finalResponse,
  };
}

/** Tool: consulta FPS por juego desde games.gpu_fps_base y nunca desde products.benchmarks. */
export async function getGameFps(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  if (context.pageContext?.route === "comparator") return getComparisonFps(input, context);
  const gameId = sanitizeIdentifier(input.gameId);
  const gameSlug = sanitizeSearch(input.gameSlug).toLowerCase();
  const gameName = sanitizeSearch(input.gameName);

  let gameRow: Row | null = null;
  if (gameId || gameSlug || gameName) {
    let query = getGameQuery(context.supabase).limit(1);
    if (gameId) query = query.eq("id", gameId);
    else if (gameSlug) query = query.eq("slug", gameSlug);
    else query = query.ilike("name", `%${gameName}%`);

    const { data, error } = await query.maybeSingle();
    if (error) return getToolFailure("No se pudo consultar el juego solicitado.");
    gameRow = data ? asRow(data) : null;
    if (!gameRow) return getToolFailure("No encontré ese juego en la base de datos de rendimiento.");
  } else {
    const { data, error } = await context.supabase
      .from("games")
      .select("id,slug,name")
      .order("name", { ascending: true })
      .limit(20);
    if (error) return getToolFailure("No se pudo consultar el catálogo de juegos.");
    return getToolSuccess({
      games: asRows(data).map((game) => ({
        id: asText(game.id),
        slug: asText(game.slug),
        name: asText(game.name),
      })),
      message: "Indica el juego para consultar sus FPS verificados. No se debe usar el FPS genérico del producto como sustituto.",
    });
  }

  const requestedGpuIds = Array.isArray(input.gpuIds)
    ? input.gpuIds.map(sanitizeIdentifier).filter(Boolean).slice(0, 4)
    : [];
  const visibleIds = getVisibleFpsGpuIds(context);
  const selectedIds = Array.from(new Set((requestedGpuIds.length > 0 ? requestedGpuIds : visibleIds).filter(Boolean))).slice(0, 4);
  if (selectedIds.length === 0) {
    return getToolFailure("Indica los IDs de las GPUs o abre una ficha, comparación, combo o build con una GPU visible.");
  }

  const pageContext = context.pageContext;
  const pageComponentIds = pageContext?.entityComponents?.map((component) => component.id) || [];
  const shouldEstimateSystem = Boolean(
    pageContext?.entityType
    && FPS_CONTEXT_ENTITY_TYPES.has(pageContext.entityType)
    && pageComponentIds.length > 0
    && selectedIds.some((id) => getVisibleFpsGpuIds(context).includes(id)),
  );
  const idsToFetch = Array.from(new Set([
    ...selectedIds,
    ...(shouldEstimateSystem ? pageComponentIds : []),
  ]));
  const { data: products, error: productsError } = await getProductQuery(context.supabase).in("id", idsToFetch);
  if (productsError) return getToolFailure("No se pudieron consultar las GPUs para obtener sus FPS.");

  const productsById = new Map(asRows(products).map((product) => [asText(product.id), product]));
  const selectedProducts = selectedIds
    .map((id) => productsById.get(id))
    .filter((product): product is Row => Boolean(product));
  if (selectedProducts.length !== selectedIds.length) {
    return getToolFailure("Una de las GPUs solicitadas ya no está disponible en el catálogo.");
  }
  if (selectedProducts.some((product) => asText(product.type).toLowerCase() !== "gpu")) {
    return getToolFailure("Esta consulta de FPS solo admite tarjetas gráficas.");
  }

  const game = getGameData(gameRow);
  const preset = GAME_PRESETS.has(sanitizeSearch(input.preset).toLowerCase())
    ? sanitizeSearch(input.preset).toLowerCase()
    : "medio";
  const requestedResolution = sanitizeSearch(input.resolution).toLowerCase() as GameResolution;
  const resolutions = GAME_RESOLUTIONS.includes(requestedResolution) ? [requestedResolution] : GAME_RESOLUTIONS;
  const currency = getCurrency(new URLSearchParams(pageContext?.search || "").get("currency"));

  let systemScores: { cpuGamingScore?: number; ramGamingScore?: number } | undefined;
  if (shouldEstimateSystem) {
    const cpuId = pageContext?.entityComponents?.find((component) => component.slot === "cpu")?.id;
    const ramId = pageContext?.entityComponents?.find((component) => component.slot === "ram")?.id;
    const cpu = cpuId ? productsById.get(cpuId) : undefined;
    const ram = ramId ? productsById.get(ramId) : undefined;
    const cpuSummary = cpu ? getProductSummary(cpu, currency, context.priceContext) : null;
    const ramSummary = ram ? getProductSummary(ram, currency, context.priceContext) : null;
    systemScores = {
      ...(cpuSummary ? { cpuGamingScore: asNumber(getObject(cpuSummary.scoring).Gaming) ?? undefined } : {}),
      ...(ramSummary ? { ramGamingScore: asNumber(getObject(ramSummary.scoring).Gaming) ?? undefined } : {}),
    };
  }

  const components = selectedProducts.map((product) => {
    const gpuId = asText(product.id);
    const fps = shouldEstimateSystem
      ? (() => {
          const estimated = calculateComboFps({ gpu: product }, game, preset, systemScores);
          const values: Record<string, number | null> = {
            "1080p": estimated.fhd,
            "1440p": estimated.qhd,
            "4k": estimated.uhd,
          };
          return Object.fromEntries(resolutions.map((resolution) => [resolution, values[resolution]]));
        })()
      : Object.fromEntries(resolutions.map((resolution) => [
          resolution,
          getBaseGameFps(game, gpuId, resolution, preset),
        ]));

    return {
      component: getFpsProductSummary(product, currency, context.priceContext),
      fps,
      dataAvailable: Object.values(fps).some((value) => typeof value === "number" && value > 0),
    };
  });

  return getToolSuccess({
    source: "CoreXScoring · games.gpu_fps_base",
    mode: shouldEstimateSystem ? "combo_or_build_estimate" : "gpu_direct",
    game: {
      id: game.id,
      slug: game.slug,
      name: game.name,
      requirements: {
        cpuScoreIdeal: game.cpu_score_ideal,
        ramMinimumGb: game.ram_minima_gb,
        vramMinimumGb: game.vram_minima_gb,
        engineFpsLimit: game.limite_motor_fps,
      },
    },
    configuration: {
      preset,
      resolution: requestedResolution && GAME_RESOLUTIONS.includes(requestedResolution) ? requestedResolution : "all",
    },
    components,
    note: shouldEstimateSystem
      ? "FPS estimados con el FPS base del juego y el límite de CPU/RAM de la build o combo visible."
      : "FPS directos por GPU registrados en games.gpu_fps_base. Los benchmarks de products no se usan como FPS de este juego.",
  });
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
    verdict: getComparisonVerdict(components, "product"),
    rankingByGamingScore: ranked.map((component, index) => ({
      position: index + 1,
      id: component.id,
      name: component.name,
      gamingScore: getObject(component.scoring).Gaming ?? null,
    })),
    rankingByValueScore: [...components]
      .sort((left, right) => getScore(right, ["Calidad Precio", "Calidad precio", "Calidad/precio", "calidadPrecio"]) - getScore(left, ["Calidad Precio", "Calidad precio", "Calidad/precio", "calidadPrecio"]))
      .map((component, index) => ({
        position: index + 1,
        id: component.id,
        name: component.name,
        valueScore: getScore(component, ["Calidad Precio", "Calidad precio", "Calidad/precio", "calidadPrecio"]),
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
    .select(AI_PRODUCT_SELECT)
    .eq("type", type)
    .order("priority", { ascending: true })
    .limit(40);
  if (maxPriceUsd !== null && maxPriceUsd >= 0) query = query.or(`price_usd.lte.${maxPriceUsd},and(price_usd.is.null,price_base_usd.lte.${maxPriceUsd})`);

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

/** Tool: lee la comparación local actual usando entidades verificadas por el servidor. */
export async function getCurrentComparison(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  void args;
  const pageContext = context.pageContext;
  const comparison = pageContext?.route === "comparator" ? pageContext.comparison : undefined;
  const itemIds = comparison?.itemIds || [];
  if (itemIds.length === 0) return getToolFailure("La comparación actual está vacía.");

  const currency = getCurrency(new URLSearchParams(pageContext?.search || "").get("currency"));
  const comparisonItems = comparison?.items?.length === itemIds.length
    ? comparison.items
    : itemIds.map((id) => ({ id, entityType: "product" as const }));
  const entityTypes = new Set(comparisonItems.map((item) => item.entityType));
  if (entityTypes.size > 1) return getToolFailure("No se pueden comparar componentes, combos y builds entre sí. La comparativa debe contener un único tipo.");
  const entityType = [...entityTypes][0] || "product";
  const [{ data: products, error: productError }, { data: combos, error: comboError }, { data: builds, error: buildError }] = await Promise.all([
    entityType === "product"
      ? getProductQuery(context.supabase).in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    entityType === "combo"
      ? getActiveComboQuery(context.supabase).in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    entityType === "build"
      ? getActiveBuildQuery(context.supabase).in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (productError || comboError || buildError) return getToolFailure("No se pudo consultar la comparación actual.");

  const rowsById = new Map<string, Row>(
    asRows(entityType === "product" ? products : entityType === "combo" ? combos : builds)
      .map((row) => [asText(row.id), row]),
  );
  const items = itemIds.flatMap((id) => {
    const row = rowsById.get(id);
    if (!row) return [];
    if (entityType === "product") return [getProductSummary(row, currency, context.priceContext)];
    return [entityType === "combo"
      ? summarizeCombo(row, currency, context.priceContext)
      : summarizeBuild(row, currency, context.priceContext)];
  });

  if (items.length < itemIds.length) return getToolFailure("Uno de los elementos de la comparación ya no está disponible.");

  return getToolSuccess({
    currency,
    entityType,
    count: items.length,
    items,
    ...(entityType === "product" ? { components: items } : {}),
    verdict: getComparisonVerdict(items, entityType),
    note: "Estos datos proceden de la comparación local actual y fueron reconsultados por el servidor. El veredicto combina rendimiento y calidad/precio usando los precios evaluados vigentes.",
  });
}

function getComparisonIds(context: AiToolContext): string[] {
  return context.pageContext?.route === "comparator"
    ? context.pageContext.comparison?.itemIds || []
    : [];
}

function getComparisonEntities(context: AiToolContext) {
  const comparison = context.pageContext?.route === "comparator" ? context.pageContext.comparison : undefined;
  return comparison?.items?.length
    ? comparison.items
    : (comparison?.itemIds || []).map((id) => ({ id, entityType: "product" as const }));
}

async function resolveComparisonRows(
  context: AiToolContext,
  entities: Array<{ id: string; entityType: "product" | "combo" | "build" }>,
): Promise<{ rows: Map<string, Row>; error: boolean }> {
  const productIds = entities.filter((entity) => entity.entityType === "product").map((entity) => entity.id);
  const comboIds = entities.filter((entity) => entity.entityType === "combo").map((entity) => entity.id);
  const buildIds = entities.filter((entity) => entity.entityType === "build").map((entity) => entity.id);
  const [{ data: products, error: productError }, { data: combos, error: comboError }, { data: builds, error: buildError }] = await Promise.all([
    productIds.length ? getProductQuery(context.supabase).in("id", productIds) : Promise.resolve({ data: [], error: null }),
    comboIds.length ? getActiveComboQuery(context.supabase).in("id", comboIds) : Promise.resolve({ data: [], error: null }),
    buildIds.length ? getActiveBuildQuery(context.supabase).in("id", buildIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const rows = new Map<string, Row>();
  asRows(products).forEach((row) => rows.set(`product:${asText(row.id)}`, row));
  asRows(combos).forEach((row) => rows.set(`combo:${asText(row.id)}`, row));
  asRows(builds).forEach((row) => rows.set(`build:${asText(row.id)}`, row));
  return { rows, error: Boolean(productError || comboError || buildError) };
}

function getComparisonUiItem(
  row: Row,
  entityType: "product" | "combo" | "build",
  currency: Currency,
  priceContext: AiToolContext["priceContext"],
): Row {
  if (entityType === "product") {
    return {
      ...row,
      comparisonType: "product",
      price: resolveProductPrice(row, currency).value,
      currency,
    };
  }
  const parts = entityType === "combo" ? ["cpu", "gpu", "ram"] : ["cpu", "gpu", "ram", "motherboard", "storage", "psu"];
  const effective = applyComparisonPartPrices(row, parts, currency, priceContext);
  const totalPrice = parts.reduce((total, part) => total + (entityType === "combo"
    ? getComboPartPrice(effective, part as "cpu" | "gpu" | "ram", currency)
    : getPartPrice(effective, part, currency)), 0);
  return {
    ...effective,
    type: entityType.toUpperCase(),
    comparisonType: entityType,
    name: asText(effective.title),
    brand: entityType.toUpperCase(),
    price: roundNumber(totalPrice),
    currency,
  };
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
    .select(AI_PRODUCT_SELECT)
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
  const selectedPrice = resolveProductPrice(productRow, currency).value;
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

/** Tool: prepara una acción local para quitar un elemento que sigue en la comparación. */
export async function proposeRemoveFromComparison(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const itemId = sanitizeIdentifier(asRow(args).id);
  const currentEntities = getComparisonEntities(context);
  const currentIds = currentEntities.map((entity) => entity.id);
  if (!context.pageContext || context.pageContext.route !== "comparator") {
    return getToolFailure("Abre el comparador para poder quitar un elemento.");
  }
  if (!itemId || !currentIds.includes(itemId)) return getToolFailure("Ese componente no está en la comparación actual.");

  const entity = currentEntities.find((candidate) => candidate.id === itemId) || { id: itemId, entityType: "product" as const };
  const resolved = await resolveComparisonRows(context, [entity]);
  if (resolved.error) return getToolFailure("No pude validar el elemento que quieres quitar.");
  const row = resolved.rows.get(`${entity.entityType}:${itemId}`);
  if (!row) return getToolFailure("No pude validar el elemento que quieres quitar.");

  const productName = asText(row.name || row.title, "el elemento");
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

/** Aplica una intención compuesta sobre una instantánea validada del comparador. */
export async function proposeUpdateComparison(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  const pageContext = context.pageContext;
  if (!pageContext || pageContext.route !== "comparator") {
    return getToolFailure("Abre el comparador para poder actualizar la comparación.");
  }

  const mode = input.mode === "replace" ? "replace" : input.mode === "patch" ? "patch" : null;
  if (!mode) return getToolFailure("La actualización de la comparación no es válida.");
  const currentEntities = getComparisonEntities(context);
  const currentIds = currentEntities.map((entity) => entity.id);
  const removeIds = Array.isArray(input.removeIds) ? input.removeIds.map(sanitizeIdentifier).filter(Boolean) : [];
  const rawAdditions = Array.isArray(input.additions) ? input.additions : [];
  const rawPriceOverrides = Array.isArray(input.priceOverrides) ? input.priceOverrides : [];
  if (removeIds.length > 3 || rawAdditions.length > 3 || rawPriceOverrides.length > 3) {
    return getToolFailure("La comparación admite como máximo tres elementos por operación.");
  }
  if (new Set(removeIds).size !== removeIds.length) return getToolFailure("No repitas un componente al quitarlo.");
  if (mode === "replace" && removeIds.length > 0) return getToolFailure("Usa replace sin removeIds: replace ya limpia la comparación.");
  if (mode === "patch" && removeIds.some((id) => !currentIds.includes(id))) {
    return getToolFailure("Uno de los componentes que quieres quitar ya no está en la comparación.");
  }

  const currentType = currentEntities.length > 0 ? currentEntities[0].entityType : undefined;
  if (new Set(currentEntities.map((entity) => entity.entityType)).size > 1) {
    return getToolFailure("La comparación actual contiene tipos incompatibles. No se puede modificar una comparativa mixta.");
  }
  const additions = rawAdditions.map(asRow).map((addition) => ({
    id: sanitizeIdentifier(addition.id),
    entityType: addition.entityType === "combo" || addition.entityType === "build" || addition.entityType === "product"
      ? addition.entityType
      : currentType || "product",
    price: addition.price === undefined ? undefined : asNumber(addition.price),
  }));
  if (additions.some((addition) => !addition.id) || new Set(additions.map((addition) => addition.id)).size !== additions.length) {
    return getToolFailure("Cada elemento a añadir debe tener un ID único.");
  }
  if (mode === "patch" && additions.some((addition) => currentIds.includes(addition.id))) {
    return getToolFailure("No puedes añadir un elemento que ya está en la comparación.");
  }
  if (currentType && additions.some((addition) => addition.entityType !== currentType)) {
    return getToolFailure("No puedes mezclar componentes, combos y builds en la misma comparación.");
  }

  const pageCurrency = getCurrency(new URLSearchParams(pageContext.search || "").get("currency"));
  const requestedCurrency = input.currency === undefined ? pageCurrency : isCurrency(input.currency) ? input.currency.toUpperCase() as Currency : null;
  if (!requestedCurrency || requestedCurrency !== pageCurrency) {
    return getToolFailure(`El comparador está mostrando precios en ${pageCurrency}. Usa esa moneda para personalizar precios.`);
  }

  const requestedPrices = new Map<string, number>();
  const registerPrice = (id: string, value: unknown): string | null => {
    const price = asNumber(value);
    if (!id || price === null || price <= 0 || price > 1_000_000) return "Indica precios positivos y válidos.";
    if (requestedPrices.has(id)) return "No indiques dos precios para el mismo componente.";
    requestedPrices.set(id, Number(price.toFixed(2)));
    return null;
  };
  for (const addition of additions) {
    if (addition.price !== undefined && addition.entityType === "product") {
      const error = registerPrice(addition.id, addition.price);
      if (error) return getToolFailure(error);
    }
  }
  for (const override of rawPriceOverrides.map(asRow)) {
    const error = registerPrice(sanitizeIdentifier(override.id), override.price);
    if (error) return getToolFailure(error);
  }

  const finalEntities = mode === "replace"
    ? additions.map(({ id, entityType }) => ({ id, entityType }))
    : [...currentEntities.filter((entity) => !removeIds.includes(entity.id)), ...additions.map(({ id, entityType }) => ({ id, entityType }))];
  if (finalEntities.length > 3) return getToolFailure("El resultado supera el límite de tres elementos en la comparación.");
  if (new Set(finalEntities.map((entity) => entity.id)).size !== finalEntities.length) return getToolFailure("La comparación resultante contiene elementos duplicados.");

  const resolved = await resolveComparisonRows(context, [...currentEntities, ...additions.map(({ id, entityType }) => ({ id, entityType }))]);
  if (resolved.error) return getToolFailure("No se pudieron validar los elementos de la comparación.");
  if (finalEntities.some((entity) => !resolved.rows.has(`${entity.entityType}:${entity.id}`))) {
    return getToolFailure("No encontré uno de los elementos indicados en el comparador.");
  }

  const finalProducts = finalEntities.map((entity) => resolved.rows.get(`${entity.entityType}:${entity.id}`)!);
  const finalTypes = new Set(finalEntities.map((entity) => entity.entityType));
  if (finalTypes.size > 1) return getToolFailure("No puedes mezclar componentes, combos y builds en la misma comparación.");
  if (finalEntities[0]?.entityType === "product") {
    const productTypes = new Set(finalProducts.map((product) => asText(product.type).toLowerCase()).filter(Boolean));
    if (productTypes.size > 1 || [...productTypes].some((type) => !COMPONENT_TYPES.has(type))) {
      return getToolFailure("Todos los componentes de la comparación deben ser del mismo tipo.");
    }
  }

  const evaluatedPrices: Record<string, number> = {};
  const evaluatedPartPrices: Record<string, Record<string, number>> = {};
  const finalIds = finalEntities.map((entity) => entity.id);
  const finalParts = new Map<string, Set<string>>();
  finalEntities.forEach((entity) => {
    if (entity.entityType !== "product") {
      const row = resolved.rows.get(`${entity.entityType}:${entity.id}`)!;
      const parts = entity.entityType === "combo" ? ["cpu", "gpu", "ram"] : ["cpu", "gpu", "ram", "motherboard", "storage", "psu"];
      finalParts.set(entity.id, new Set(parts.flatMap((part) => asText(row[`${part}_id`]) ? [asText(row[`${part}_id`])] : [])));
    }
  });
  if ([...requestedPrices.keys()].some((id) => (
    !finalEntities.some((entity) => entity.id === id)
    && ![...finalParts.values()].some((partIds) => partIds.has(id))
  ))) {
    return getToolFailure("Solo puedes asignar precio a elementos o piezas que permanezcan en la comparación.");
  }
  for (const item of context.priceContext?.items || []) {
    const collection = finalEntities.find((entity) => finalParts.get(entity.id)?.has(item.productId));
    if (item.isCustom && collection) {
      const slot = item.slot || "";
      if (slot) evaluatedPartPrices[collection.id] = { ...(evaluatedPartPrices[collection.id] || {}), [slot]: Number((context.priceContext?.currency === pageCurrency ? item.price : convertPrice(item.price, context.priceContext!.currency, pageCurrency)).toFixed(2)) };
    }
    if (item.isCustom && finalIds.includes(item.productId)) {
      evaluatedPrices[item.productId] = Number((context.priceContext?.currency === pageCurrency
        ? item.price
        : convertPrice(item.price, context.priceContext!.currency, pageCurrency)).toFixed(2));
    }
  }
  for (const [id, price] of requestedPrices) evaluatedPrices[id] = price;
  for (const override of rawPriceOverrides.map(asRow)) {
    const id = sanitizeIdentifier(override.id);
    const slot = sanitizeIdentifier(override.slot);
    const price = requestedPrices.get(id);
    if (!price || !slot) continue;
    const collection = finalEntities.find((entity) => finalParts.get(entity.id)?.has(id));
    if (collection) evaluatedPartPrices[collection.id] = { ...(evaluatedPartPrices[collection.id] || {}), [slot]: price };
  }

  const items = finalEntities.map((entity) => getComparisonUiItem(resolved.rows.get(`${entity.entityType}:${entity.id}`)!, entity.entityType, pageCurrency, context.priceContext));
  const names = finalEntities.map((entity) => asText(resolved.rows.get(`${entity.entityType}:${entity.id}`)!.name || resolved.rows.get(`${entity.entityType}:${entity.id}`)!.title, "Elemento"));
  const summary = finalEntities.length === 0
    ? "He limpiado la comparación."
    : `Comparación actualizada con ${names.join(", ")}.`;

  return {
    ok: true,
    data: { status: "ready", message: summary },
    comparisonAction: { type: "replace", items, evaluatedPrices, evaluatedPartPrices, summary },
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
    .select(AI_PRODUCT_SELECT)
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
