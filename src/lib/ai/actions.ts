import { createHmac } from "node:crypto";
import { getRequiredServerSecret } from "@/lib/server-secrets";
import type { AiActionType, BuildDraft, BuildDraftComponent, BuildSlot, ComboDraft, ComboDraftComponent, ComboSlot, PendingAction, PendingActionComponent, RecommendationComponentConstraint, RecommendationState } from "./types";
import type { AiToolContext, AiToolResult } from "./tools/types";
import { getProductPrice } from "@/lib/catalog/product-price";
import { getComponentNotes } from "@/lib/scoring/components";
import { getRecommendationStateMessage, getStateComponents, getStateCriteria, markRecommendationPlanned, mergeRecommendationState } from "./recommendation-state";

type Row = Record<string, unknown>;
type ActionSlot = ComboSlot | "motherboard" | "storage" | "psu";
type BuildRequirementSlot = BuildSlot | ComboSlot;

export type ActionComponentIds = Partial<Record<BuildSlot, string>>;
export type ActionPrices = Partial<Record<ActionSlot, { USD?: number; EUR?: number }>>;

export interface CreateComboActionPayload {
  title: string;
  componentIds: Pick<ActionComponentIds, ComboSlot>;
  customPrices: ActionPrices;
}

export interface CreateBuildActionPayload {
  title: string;
  category: string;
  componentIds: Required<ActionComponentIds>;
  customPrices: ActionPrices;
}

export interface SetCustomPriceActionPayload {
  entityType: "combo" | "build";
  entityId: string;
  slot: ActionSlot;
  currency: "USD" | "EUR";
  price: number;
}

interface BuildComponentRequirement {
  query: string;
  customPrice?: number;
  priceMode?: "custom" | "catalog" | "msrp";
  owned?: boolean;
  role?: RecommendationComponentConstraint["role"];
}

interface BuildRecommendationCriteria {
  budget: number;
  currency: "USD" | "EUR";
  useCase: "gaming" | "productivity" | "creation" | "balanced";
  resolution?: "1080p" | "1440p" | "4k";
  priority: "value" | "performance" | "balanced";
  preferences?: string;
  workloads?: string[];
  fpsTarget?: number;
  excludedComponents?: string[];
  preferredBrands?: string[];
  market: "new" | "used";
}

const RECOMMENDATION_BUDGET_TOLERANCE = 0.05;
const RECOMMENDATION_CANDIDATE_LIMIT = 12;
const COMBO_SCORE_RELATIVE_TOLERANCE = 0.05;
export type PendingActionPayload =
  | CreateComboActionPayload
  | CreateBuildActionPayload
  | SetCustomPriceActionPayload;

export class AiActionExecutionError extends Error {
  constructor(
    readonly code: string,
    readonly databaseCode?: string,
    readonly databaseMessage?: string,
    message = "No se pudo guardar la entidad en la bóveda.",
  ) {
    super(message);
  }
}

const COMBO_SLOTS: ComboSlot[] = ["cpu", "gpu", "ram"];
const BUILD_SLOTS: BuildSlot[] = ["cpu", "gpu", "ram", "motherboard", "storage", "psu"];
const PRODUCT_TYPES = new Set(BUILD_SLOTS);
const ACTION_TYPES = new Set<AiActionType>(["create_combo", "create_build", "set_custom_price"]);

function asRow(value: unknown): Row {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseJson(value: unknown): Row {
  if (typeof value !== "string") return asRow(value);
  try {
    return asRow(JSON.parse(value));
  } catch {
    return {};
  }
}

function normalize(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[\s_-]+/g, "");
}

function getSocket(product: Row): string {
  const compatibility = parseJson(product.compatibility);
  return normalize(compatibility.socket);
}

function getRamType(product: Row): string {
  const specs = parseJson(product.specs);
  const compatibility = parseJson(product.compatibility);
  return normalize(specs.type ?? specs.technology ?? specs.memory_type ?? compatibility.ram_type);
}

function getRamCapacity(product: Row): number {
  const specs = parseJson(product.specs);
  const value = Number(specs.capacity_gb ?? specs.capacity ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function isCompatibleCpuRam(cpu: Row, ram: Row): boolean {
  const cpuCompatibility = parseJson(cpu.compatibility);
  const expectedRamType = normalize(cpuCompatibility.ram_type);
  const actualRamType = getRamType(ram);
  return !(expectedRamType && actualRamType && !expectedRamType.includes(actualRamType) && !actualRamType.includes(expectedRamType));
}

function sanitizeTitle(value: unknown, fallback: string): string {
  return asText(value, fallback).trim().replace(/\s+/g, " ").slice(0, 80);
}

function sanitizeCategory(value: unknown): string {
  return asText(value, "Personalizada").trim().replace(/\s+/g, " ").slice(0, 60) || "Personalizada";
}

function normalizeMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeBuildQuery(value: unknown): string {
  const raw = asText(value)
    .trim()
    .slice(0, 100)
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  // El modelo puede conservar lenguaje natural del usuario ("cualquier
  // placa B550 a precio MSRP"). Esos modificadores no forman parte del nombre
  // del producto y harían que el filtro ilike no encontrase nada.
  return raw
    .replace(/\b(?:cualquier|cualquiera|placa\s+base|placa|precio|msrp|catalogo|catálogo|catalog|real|con|de|a|por)\b/giu, " ")
    .replace(/\b(?:a|por)\s+(?:\d+(?:[.,]\d+)?\s*(?:usd|eur|\$|€)?)\b/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBuildRequirement(value: unknown): BuildComponentRequirement | null {
  const input = asRow(value);
  const query = sanitizeBuildQuery(input.query);
  if (!query) return null;

  const priceMode = input.priceMode === "custom" || input.priceMode === "msrp" || input.priceMode === "catalog"
    ? input.priceMode
    : input.customPrice !== undefined ? "custom" : "catalog";
  const customPrice = Number(input.customPrice);
  const role = input.role === "required" || input.role === "preferred" || input.role === "owned" || input.role === "excluded"
    ? input.role as RecommendationComponentConstraint["role"]
    : undefined;
  return {
    query,
    priceMode,
    ...(role ? { role, owned: role === "owned" } : {}),
    ...(Number.isFinite(customPrice) && customPrice > 0 && customPrice <= 1_000_000
      ? { customPrice: Number(customPrice.toFixed(2)) }
      : {}),
  };
}

function getBuildCandidateScore(row: Row, query: string): number {
  const normalizedQuery = normalizeMatch(query);
  const normalizedName = normalizeMatch(asText(row.name));
  const normalizedBrand = normalizeMatch(asText(row.brand));
  const normalizedSlug = normalizeMatch(asText(row.slug));
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const nameTokens = new Set(normalizedName.split(" ").filter(Boolean));
  const allTokensMatch = queryTokens.length > 0 && queryTokens.every((token) => nameTokens.has(token));

  if (normalizedName === normalizedQuery) return 1_000;
  if (allTokensMatch) return 900;
  if (normalizedName.includes(normalizedQuery)) return 800;
  if (normalizedBrand.includes(normalizedQuery) || normalizedSlug.includes(normalizedQuery)) return 650;
  const matchingTokens = queryTokens.filter((token) => normalizedName.includes(token)).length;
  return matchingTokens > 0 ? 400 + matchingTokens * 20 : 0;
}

async function resolveBuildComponent(
  slot: BuildRequirementSlot,
  requirement: BuildComponentRequirement,
  context: AiToolContext,
): Promise<{ row?: Row; candidates?: Row[]; error?: string }> {
  // Leemos un conjunto amplio del tipo y hacemos el ranking en servidor. Un
  // filtro ilike con la frase completa falla con entradas naturales como
  // "SSD de 1TB" o "cualquier placa B550", aunque el producto sí exista.
  const request = context.supabase
    .from("products_with_priority")
    .select("id,name,brand,slug,type,specs,compatibility,price_usd,price_eur,price_base_usd,price_base_eur")
    .eq("type", slot)
    .limit(100);

  const { data, error } = await request;
  if (error) return { error: `No se pudo resolver el componente ${slot}.` };

  const ranked = (Array.isArray(data) ? data.map(asRow) : [])
    .map((row) => ({ row, score: getBuildCandidateScore(row, requirement.query) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      const scoreDifference = right.score - left.score;
      if (scoreDifference !== 0) return scoreDifference;
      const leftTokenCount = normalizeMatch(asText(left.row.name)).split(" ").filter(Boolean).length;
      const rightTokenCount = normalizeMatch(asText(right.row.name)).split(" ").filter(Boolean).length;
      if (leftTokenCount !== rightTokenCount) return leftTokenCount - rightTokenCount;
      const priceDifference = getProductPrice(left.row, "USD") - getProductPrice(right.row, "USD");
      if (priceDifference !== 0) return priceDifference;
      return asText(left.row.name).localeCompare(asText(right.row.name));
    });

  if (ranked.length === 0) return { error: `No encontré un componente ${slot} que coincida con «${requirement.query}».` };
  // La propuesta visible permite revisar la elección y cancelarla. Por eso,
  // ante peticiones explícitamente abiertas (B550/SSD/RAM «cualquiera») es
  // mejor elegir de forma determinista que devolver el control al modelo para
  // que repita la misma tool indefinidamente.
  return { row: ranked[0].row };
}

function getBuildRecommendationCriteria(input: Row): BuildRecommendationCriteria | null {
  const budget = Number(input.budget ?? input.budgetUsd);
  if (!Number.isFinite(budget) || budget <= 0 || budget > 1_000_000) return null;
  const useCase = input.useCase === "gaming" || input.useCase === "productivity" || input.useCase === "creation" || input.useCase === "balanced"
    ? input.useCase
    : "balanced";
  const priority = input.priority === "value" || input.priority === "performance" || input.priority === "balanced"
    ? input.priority
    : "balanced";
  const resolution = input.resolution === "1080p" || input.resolution === "1440p" || input.resolution === "4k"
    ? input.resolution
    : undefined;
  const preferences = asText(input.preferences).trim().slice(0, 300);
  return {
    budget: Number(budget.toFixed(2)),
    currency: input.currency === "EUR" ? "EUR" : "USD",
    useCase,
    priority,
    ...(resolution ? { resolution } : {}),
    ...(preferences ? { preferences } : {}),
    ...(Array.isArray(input.workloads) ? { workloads: input.workloads.filter((item): item is string => typeof item === "string").slice(0, 12) } : {}),
    ...(Number.isFinite(Number(input.fpsTarget)) && Number(input.fpsTarget) > 0 ? { fpsTarget: Number(Number(input.fpsTarget).toFixed(2)) } : {}),
    ...(Array.isArray(input.excludedComponents) ? { excludedComponents: input.excludedComponents.filter((item): item is string => typeof item === "string").slice(0, 12) } : {}),
    ...(Array.isArray(input.preferredBrands) ? { preferredBrands: input.preferredBrands.filter((item): item is string => typeof item === "string").slice(0, 12) } : {}),
    market: input.market === "used" ? "used" : "new",
  };
}

function mergeStateIntoPlanInput(input: Row, state: RecommendationState | undefined): Row {
  if (!state) return input;
  const stateCriteria = getStateCriteria(state);
  const stateComponents = getStateComponents(state);
  const stateConstraints = state?.constraints;
  const inputCriteria = asRow(input.criteria);
  const inputComponents = asRow(input.components);
  const criteria = {
    ...stateCriteria,
    ...(stateConstraints?.excludedComponents ? { excludedComponents: stateConstraints.excludedComponents } : {}),
    ...(stateConstraints?.preferredBrands ? { preferredBrands: stateConstraints.preferredBrands } : {}),
    ...(stateConstraints?.market ? { market: stateConstraints.market } : {}),
    ...inputCriteria,
  };
  const components = {
    ...Object.fromEntries(Object.entries(stateComponents).map(([slot, constraint]) => [slot, constraint])),
    ...inputComponents,
  };
  return {
    ...input,
    ...criteria,
    criteria,
    components,
  };
}

function getEffectiveRequirementPrice(row: Row, requirement: BuildComponentRequirement | undefined, currency: "USD" | "EUR"): number {
  if (requirement?.owned) return 0;
  if (requirement?.priceMode === "custom" && requirement.customPrice !== undefined) return requirement.customPrice;
  return getProductPrice(row, currency);
}

function getRecommendationScore(row: Row, criteria: BuildRecommendationCriteria): number {
  const price = getProductPrice(row, criteria.currency);
  if (price <= 0) return Number.NEGATIVE_INFINITY;
  const profile = criteria.useCase === "gaming"
    ? "gaming"
    : criteria.useCase === "productivity" || criteria.useCase === "creation" ? "productivity" : "balanced";
  const notes = getComponentNotes(row, price, profile);
  const noteValues = Object.values(notes).filter((value) => Number.isFinite(value));
  const averageNotes = noteValues.length > 0 ? noteValues.reduce((sum, value) => sum + value, 0) / noteValues.length : 0;
  const primary = criteria.useCase === "gaming"
    ? Number(notes.Gaming ?? notes["Rendimiento"] ?? averageNotes)
    : criteria.useCase === "productivity" || criteria.useCase === "creation"
      ? Number(notes["Productividad"] ?? notes["Rendimiento"] ?? averageNotes)
      : Number(notes["Rendimiento"] ?? averageNotes);
  const value = Number(notes["Calidad precio"] ?? notes["Calidad Precio"] ?? averageNotes);
  const primaryWeight = criteria.priority === "performance" ? 0.8 : criteria.priority === "value" ? 0.4 : 0.6;
  const valueWeight = 1 - primaryWeight;
  const brand = normalizeMatch(asText(row.brand));
  const preferredBrand = criteria.preferredBrands?.some((item) => brand.includes(normalizeMatch(item))) ? 0.4 : 0;
  return primary * primaryWeight + value * valueWeight + preferredBrand;
}

function getRecommendationBudgetLimit(criteria: BuildRecommendationCriteria): number {
  return Number((criteria.budget * (1 + RECOMMENDATION_BUDGET_TOLERANCE)).toFixed(2));
}

function isNewMarketEligible(row: Row, slot: BuildSlot): boolean {
  if (slot !== "cpu" && slot !== "gpu") return true;
  const text = normalizeMatch(`${asText(row.brand)} ${asText(row.name)} ${asText(row.slug)}`);
  if (slot === "gpu") {
    if (/\b(?:nvidia|geforce)\b/.test(text)) return /\brtx\s*(?:40|50)\d{2}\b/.test(text);
    if (/\b(?:amd|radeon)\b/.test(text)) return /\brx\s*[7-9]\d{3}\b/.test(text);
    if (/\bintel\b/.test(text)) return /\barc\s+b\d{3}\b/.test(text);
    return false;
  }

  if (/\b(?:amd|ryzen)\b/.test(text)) {
    const match = text.match(/\bryzen\s+(?:[3579]\s+)?([7-9]\d{3})(?:[a-z]\w*)?\b/);
    return match ? Number(match[1]) >= 7_000 : false;
  }
  if (/\b(?:intel|core)\b/.test(text)) {
    if (/\bcore\s+ultra\b/.test(text)) return true;
    const match = text.match(/\bi[3579]\s*(?:-|\s)?(\d{4,5})(?:[a-z]\w*)?\b/);
    return match ? Number(match[1]) >= 12_000 : false;
  }
  return false;
}

function isMarketEligible(row: Row, slot: BuildSlot, market: "new" | "used"): boolean {
  return market === "used" || isNewMarketEligible(row, slot);
}

function getRecommendationCandidates(
  data: unknown,
  slot: BuildSlot,
  criteria: BuildRecommendationCriteria,
): Row[] {
  const scored = (Array.isArray(data) ? data.map(asRow) : [])
    .filter((row) => getProductPrice(row, criteria.currency) > 0)
    .filter((row) => isMarketEligible(row, slot, criteria.market))
    .filter((row) => !isExcludedCandidate(row, criteria))
    .map((row) => ({ row, score: getRecommendationScore(row, criteria) }))
    .sort((left, right) => right.score - left.score || getProductPrice(left.row, criteria.currency) - getProductPrice(right.row, criteria.currency));
  const cheapest = scored
    .slice()
    .sort((left, right) => getProductPrice(left.row, criteria.currency) - getProductPrice(right.row, criteria.currency))
    .slice(0, 4);
  const unique = new Map([...scored.slice(0, RECOMMENDATION_CANDIDATE_LIMIT), ...cheapest].map((candidate) => [asText(candidate.row.id), candidate.row]));
  return [...unique.values()];
}

function isExcludedCandidate(row: Row, criteria: BuildRecommendationCriteria): boolean {
  const haystack = normalizeMatch(`${asText(row.name)} ${asText(row.brand)} ${asText(row.slug)}`);
  return criteria.excludedComponents?.some((item) => haystack.includes(normalizeMatch(item))) === true;
}

function isCompatibleMotherboard(cpu: Row, ram: Row, motherboard: Row): boolean {
  const cpuSocket = getSocket(cpu);
  const motherboardSocket = getSocket(motherboard);
  if (cpuSocket && motherboardSocket && cpuSocket !== motherboardSocket) return false;

  const motherboardCompatibility = parseJson(motherboard.compatibility);
  const supportedType = normalize(motherboardCompatibility.ram_type);
  const actualRamType = getRamType(ram);
  if (supportedType && actualRamType && !supportedType.includes(actualRamType) && !actualRamType.includes(supportedType)) return false;

  const maxCapacity = Number(motherboardCompatibility.ram_max_capacity || 0);
  return !(maxCapacity > 0 && getRamCapacity(ram) > maxCapacity);
}

async function resolveRecommendedBuild(
  criteria: BuildRecommendationCriteria,
  context: AiToolContext,
  fixedRequirements: Partial<Record<BuildSlot, BuildComponentRequirement>> = {},
): Promise<{ rows?: Record<BuildSlot, Row>; requirements?: Record<BuildSlot, BuildComponentRequirement>; error?: string }> {
  const select = "id,name,brand,slug,type,specs,compatibility,price_usd,price_eur,price_base_usd,price_base_eur,priority,release_year,market_segment";
  const results = await Promise.all(BUILD_SLOTS.map(async (slot) => {
    const { data, error } = await context.supabase
      .from("products_with_priority")
      .select(select)
      .eq("type", slot)
      .limit(100);
    return { slot, data, error };
  }));
  const fixedRows = await Promise.all(Object.entries(fixedRequirements).map(async ([slot, requirement]) => ({
    slot: slot as BuildSlot,
    requirement,
    result: await resolveBuildComponent(slot as BuildSlot, requirement, context),
  })));
  const fixedFailure = fixedRows.find((entry) => entry.result.error || !entry.result.row);
  if (fixedFailure) return { error: fixedFailure.result.error || `No pude resolver el componente ${fixedFailure.slot}.` };
  const fixedBySlot = new Map(fixedRows.map((entry) => [entry.slot, entry.result.row as Row]));
  const fixedMarketFailure = fixedRows.find((entry) => entry.result.row && !isMarketEligible(entry.result.row, entry.slot, criteria.market));
  if (fixedMarketFailure) {
    return { error: `${asText(fixedMarketFailure.result.row?.name)} no cumple las reglas del mercado ${criteria.market === "new" ? "nuevo" : "usado"}.` };
  }

  const candidates = Object.fromEntries(results.map(({ slot, data }) => [
    slot,
    fixedBySlot.has(slot)
      ? [fixedBySlot.get(slot)!]
      : getRecommendationCandidates(data, slot, criteria),
  ])) as Record<BuildSlot, Row[]>;

  const failedSlot = results.find(({ error }) => error)?.slot;
  if (failedSlot) return { error: `No se pudo consultar el catálogo para ${failedSlot}.` };
  const emptySlot = BUILD_SLOTS.find((slot) => candidates[slot].length === 0);
  if (emptySlot) return { error: `No hay candidatos con precio válido para ${emptySlot}.` };

  const budgetLimit = getRecommendationBudgetLimit(criteria);
  const cpuCandidates = candidates.cpu;
  const gpuCandidates = candidates.gpu;
  const ramBoardPairs = cpuCandidates.flatMap((cpu) => candidates.ram
    .filter((ram) => isCompatibleCpuRam(cpu, ram))
    .flatMap((ram) => candidates.motherboard
      .filter((motherboard) => isCompatibleMotherboard(cpu, ram, motherboard))
      .map((motherboard) => ({ cpu, ram, motherboard }))));
  const storagePsuPairs = candidates.storage.flatMap((storage) => candidates.psu.map((psu) => ({ storage, psu })))
    .sort((left, right) => (
      getEffectiveRequirementPrice(left.storage, fixedRequirements.storage, criteria.currency)
      + getEffectiveRequirementPrice(left.psu, fixedRequirements.psu, criteria.currency)
    ) - (
      getEffectiveRequirementPrice(right.storage, fixedRequirements.storage, criteria.currency)
      + getEffectiveRequirementPrice(right.psu, fixedRequirements.psu, criteria.currency)
    ));
  let best: { rows: Record<BuildSlot, Row>; total: number; score: number } | undefined;
  const scoreOf = (row: Row) => getRecommendationScore(row, criteria);

  for (const cpu of cpuCandidates) {
    for (const gpu of gpuCandidates) {
      const cpuGpuCost = getEffectiveRequirementPrice(cpu, fixedRequirements.cpu, criteria.currency)
        + getEffectiveRequirementPrice(gpu, fixedRequirements.gpu, criteria.currency);
      if (cpuGpuCost > budgetLimit) continue;
      for (const pair of ramBoardPairs.filter((candidate) => candidate.cpu === cpu)) {
        const cpuGpuRamBoardCost = cpuGpuCost
          + getEffectiveRequirementPrice(pair.ram, fixedRequirements.ram, criteria.currency)
          + getEffectiveRequirementPrice(pair.motherboard, fixedRequirements.motherboard, criteria.currency);
        if (cpuGpuRamBoardCost > budgetLimit) continue;
        for (const auxiliary of storagePsuPairs) {
          const total = cpuGpuRamBoardCost
            + getEffectiveRequirementPrice(auxiliary.storage, fixedRequirements.storage, criteria.currency)
            + getEffectiveRequirementPrice(auxiliary.psu, fixedRequirements.psu, criteria.currency);
          if (total > budgetLimit) break;
          const score = scoreOf(cpu) * 2.2
            + scoreOf(gpu) * 2.8
            + scoreOf(pair.ram) * 0.8
            + scoreOf(pair.motherboard) * 0.8
            + scoreOf(auxiliary.storage) * 0.4
            + scoreOf(auxiliary.psu) * 0.4;
          if (!best || score > best.score || (score === best.score && total < best.total)) {
            best = {
              total,
              score,
              rows: { cpu, gpu, ram: pair.ram, motherboard: pair.motherboard, storage: auxiliary.storage, psu: auxiliary.psu },
            };
          }
        }
      }
    }
  }

  if (!best) {
    return { error: `No encontré una combinación compatible dentro del presupuesto indicado, incluso con la tolerancia del ${RECOMMENDATION_BUDGET_TOLERANCE * 100}%.` };
  }
  return { rows: best.rows, requirements: fixedRequirements as Record<BuildSlot, BuildComponentRequirement> };
}

function getActionSecret(): string {
  return getRequiredServerSecret("AI_ACTION_SECRET");
}

function digestPayload(payload: PendingActionPayload): string {
  return createHmac("sha256", getActionSecret()).update(JSON.stringify(payload)).digest("hex");
}

function getRpcId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return getRpcId(value[0]);
  const row = asRow(value);
  return typeof row.id === "string" ? row.id : typeof row.action_id === "string" ? row.action_id : null;
}

function getComponentSummary(rows: Row[], ids: ActionComponentIds, slots: readonly BuildSlot[]): PendingActionComponent[] {
  const byId = new Map(rows.map((row) => [asText(row.id), row]));
  return slots.flatMap((slot) => {
    const id = ids[slot];
    const row = id ? byId.get(id) : undefined;
    return id && row ? [{ slot, id, name: asText(row.name), type: asText(row.type) }] : [];
  });
}

function summarizeNestedComponent(value: unknown): { id: string; name: string; type: string } | null {
  const row = Array.isArray(value) ? asRow(value[0]) : asRow(value);
  const id = asText(row.id);
  return id ? { id, name: asText(row.name), type: asText(row.type) } : null;
}

async function fetchProducts(context: AiToolContext, ids: string[]): Promise<{ rows: Row[]; error?: string }> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return { rows: [], error: "No se indicaron componentes." };
  const { data, error } = await context.supabase
    .from("products")
    .select("id,name,type,specs,compatibility,price_usd,price_eur,price_base_usd,price_base_eur")
    .in("id", uniqueIds);
  if (error) return { rows: [], error: "No se pudieron validar los componentes." };
  return { rows: Array.isArray(data) ? data.map(asRow) : [] };
}

function validateProductSet(rows: Row[], ids: ActionComponentIds, slots: readonly BuildSlot[]): string | null {
  if (slots.some((slot) => !ids[slot])) return "Faltan componentes para completar la acción.";
  if (rows.length !== slots.length) return "Uno o más componentes ya no están disponibles.";

  const byId = new Map(rows.map((row) => [asText(row.id), row]));
  for (const slot of slots) {
    const row = byId.get(ids[slot] || "");
    const type = asText(row?.type).toLowerCase();
    if (!row || !PRODUCT_TYPES.has(type as BuildSlot)) return `El componente de ${slot} no es válido.`;
    if (type !== slot) return `El componente elegido para ${slot} no coincide con ese tipo.`;
  }

  const cpu = byId.get(ids.cpu || "");
  const ram = byId.get(ids.ram || "");
  if (cpu && ram) {
    const cpuCompatibility = parseJson(cpu.compatibility);
    const expectedRamType = normalize(cpuCompatibility.ram_type);
    const actualRamType = getRamType(ram);
    if (expectedRamType && actualRamType && !actualRamType.includes(expectedRamType) && !expectedRamType.includes(actualRamType)) {
      return `${asText(cpu.name)} requiere memoria ${asText(cpuCompatibility.ram_type)}.`;
    }
    const maxRam = Number(cpuCompatibility.ram_max_support || 0);
    if (maxRam > 0 && getRamCapacity(ram) > maxRam) return `${asText(cpu.name)} admite un máximo de ${maxRam} GB de RAM.`;
  }

  if (slots.includes("motherboard")) {
    const motherboard = byId.get(ids.motherboard || "");
    if (cpu && motherboard) {
      const cpuSocket = getSocket(cpu);
      const motherboardSocket = getSocket(motherboard);
      if (cpuSocket && motherboardSocket && cpuSocket !== motherboardSocket) {
        return `${asText(cpu.name)} y ${asText(motherboard.name)} usan sockets distintos.`;
      }
    }
    if (motherboard && ram) {
      const motherboardCompatibility = parseJson(motherboard.compatibility);
      const supportedType = normalize(motherboardCompatibility.ram_type);
      const actualRamType = getRamType(ram);
      if (supportedType && actualRamType && !supportedType.includes(actualRamType) && !actualRamType.includes(supportedType)) {
        return `${asText(motherboard.name)} no admite memoria ${asText(motherboardCompatibility.ram_type)}.`;
      }
      const maxCapacity = Number(motherboardCompatibility.ram_max_capacity || 0);
      if (maxCapacity > 0 && getRamCapacity(ram) > maxCapacity) return `${asText(motherboard.name)} admite un máximo de ${maxCapacity} GB de RAM.`;
    }
  }

  return null;
}

async function createPendingAction(
  context: AiToolContext,
  type: AiActionType,
  payload: PendingActionPayload,
  title: string,
  summary: PendingAction["summary"],
): Promise<PendingAction> {
  if (!context.actionSupabase || !context.requestId) throw new Error("No se pudo crear la propuesta de acción de forma segura.");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const digest = digestPayload(payload);
  const { data, error } = await context.actionSupabase.rpc("create_ai_pending_action_server_v2", {
    p_request_id: context.requestId,
    p_user_id: context.actor.id,
    p_action_type: type,
    p_payload: payload,
    p_payload_digest: digest,
    p_summary: summary,
    p_expires_at: expiresAt,
  });
  const id = getRpcId(data);
  if (error || !id) throw new Error("No se pudo crear la propuesta de acción.");
  return { id, type, title, summary, digest, expiresAt };
}

function requirePermanentAccount(context: AiToolContext): AiToolResult | null {
  return context.actor.isAnonymous
    ? { ok: false, error: "Las acciones sobre la bóveda requieren una cuenta registrada." }
    : null;
}

export async function searchUserCombos(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const denied = requirePermanentAccount(context);
  if (denied) return denied;
  const query = asText(asRow(args).query).trim().slice(0, 80);
  let request = context.supabase
    .from("created_combos")
    .select("id,title,slug,category,created_at,cpu_id,gpu_id,ram_id,cpu:products!cpu_id(id,name,type),gpu:products!gpu_id(id,name,type),ram:products!ram_id(id,name,type)")
    .eq("user_id", context.actor.id)
    .order("created_at", { ascending: false })
    .limit(6);
  if (query) request = request.ilike("title", `%${query}%`);
  const { data, error } = await request;
  if (error) return { ok: false, error: "No se pudieron consultar tus combos." };
  return { ok: true, data: { combos: (Array.isArray(data) ? data : []).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    componentIds: { cpu: row.cpu_id, gpu: row.gpu_id, ram: row.ram_id },
    components: [row.cpu, row.gpu, row.ram].map(summarizeNestedComponent).filter((component): component is { id: string; name: string; type: string } => component !== null),
    createdAt: row.created_at,
  })) } };
}

export async function searchUserBuilds(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const denied = requirePermanentAccount(context);
  if (denied) return denied;
  const query = asText(asRow(args).query).trim().slice(0, 80);
  let request = context.supabase
    .from("created_builds")
    .select("id,title,slug,category,created_at,cpu_id,gpu_id,ram_id,motherboard_id,storage_id,psu_id,cpu:products!cpu_id(id,name,type),gpu:products!gpu_id(id,name,type),ram:products!ram_id(id,name,type),motherboard:products!motherboard_id(id,name,type),storage:products!storage_id(id,name,type),psu:products!psu_id(id,name,type)")
    .eq("user_id", context.actor.id)
    .order("created_at", { ascending: false })
    .limit(6);
  if (query) request = request.ilike("title", `%${query}%`);
  const { data, error } = await request;
  if (error) return { ok: false, error: "No se pudieron consultar tus builds." };
  return { ok: true, data: { builds: (Array.isArray(data) ? data : []).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    componentIds: {
      cpu: row.cpu_id,
      gpu: row.gpu_id,
      ram: row.ram_id,
      motherboard: row.motherboard_id,
      storage: row.storage_id,
      psu: row.psu_id,
    },
    components: [row.cpu, row.gpu, row.ram, row.motherboard, row.storage, row.psu].map(summarizeNestedComponent).filter((component): component is { id: string; name: string; type: string } => component !== null),
    createdAt: row.created_at,
  })) } };
}

function createBuildDraft(
  input: Row,
  requirements: Record<BuildSlot, BuildComponentRequirement>,
  rows: Row[],
  componentIds: Required<ActionComponentIds>,
): BuildDraft {
  const byId = new Map(rows.map((row) => [asText(row.id), row]));
  const components = Object.fromEntries(BUILD_SLOTS.map((slot) => {
    const row = byId.get(componentIds[slot]);
    const requirement = requirements[slot];
    return [slot, {
      id: componentIds[slot],
      name: asText(row?.name),
      type: slot,
       query: requirement.query,
       priceMode: requirement.priceMode || "catalog",
       ...(requirement.owned ? { owned: true } : {}),
       ...(requirement.customPrice !== undefined ? { customPrice: requirement.customPrice } : {}),
    } satisfies BuildDraftComponent];
  })) as Record<BuildSlot, BuildDraftComponent>;

  return {
    ...(asText(input.title).trim() ? { title: sanitizeTitle(input.title, "") } : {}),
    category: sanitizeCategory(input.category),
    saveState: "ready",
    currency: input.currency === "EUR" ? "EUR" : "USD",
    components,
  };
}

function getDraftComponentIds(draft: BuildDraft): Required<ActionComponentIds> {
  return Object.fromEntries(BUILD_SLOTS.map((slot) => [slot, draft.components[slot].id])) as Required<ActionComponentIds>;
}

function getDraftRequirements(draft: BuildDraft): Record<BuildSlot, BuildComponentRequirement> {
  return Object.fromEntries(BUILD_SLOTS.map((slot) => {
    const component = draft.components[slot];
    return [slot, {
      query: component.query,
      priceMode: component.priceMode,
      ...(component.owned ? { owned: true } : {}),
      ...(component.customPrice !== undefined ? { customPrice: component.customPrice } : {}),
    }];
  })) as Record<BuildSlot, BuildComponentRequirement>;
}

function getDraftCustomPrices(draft: BuildDraft): ActionPrices {
  const customPrices: ActionPrices = {};
  for (const slot of BUILD_SLOTS) {
    const component = draft.components[slot];
    if (component.priceMode === "custom" && component.customPrice !== undefined) {
      customPrices[slot] = { [draft.currency]: component.customPrice };
    }
  }
  return customPrices;
}

function getBuildPlanMessage(draft: BuildDraft): string {
  const labels: Record<BuildSlot, string> = {
    cpu: "CPU",
    gpu: "GPU",
    ram: "RAM",
    motherboard: "Placa base",
    storage: "Almacenamiento",
    psu: "Fuente",
  };
  const title = draft.title ? `Build «${draft.title}»` : "Build propuesta";
  return `${title}:\n${BUILD_SLOTS.map((slot) => `${labels[slot]}: ${draft.components[slot].name}`).join("\n")}\n\n¿Quieres cambiar algún componente o procedemos con esta build?`;
}

export async function updateBuildRecommendationState(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const state = mergeRecommendationState(context.recommendationState, "build", args);
  if (state.phase === "ready") return planBuild({}, { ...context, recommendationState: state });
  return {
    ok: true,
    data: {
      status: state.phase,
      message: getRecommendationStateMessage(state),
      missingFields: state.missingFields,
      instruction: state.missingFields.length > 0
        ? "Pregunta únicamente por los criterios mínimos que faltan. No busques componentes todavía."
        : "Usa plan_build con el estado acumulado.",
    },
    recommendationState: state,
  };
}

export async function updateComboRecommendationState(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const state = mergeRecommendationState(context.recommendationState, "combo", args);
  if (state.phase === "ready") return planCombo({}, { ...context, recommendationState: state });
  return {
    ok: true,
    data: {
      status: state.phase,
      message: getRecommendationStateMessage(state),
      missingFields: state.missingFields,
      instruction: state.missingFields.length > 0
        ? "Pregunta únicamente por los criterios mínimos que faltan. No busques componentes todavía."
        : "Usa plan_combo con el estado acumulado.",
    },
    recommendationState: state,
  };
}

/** Resuelve y valida una build sin crear todavía una acción de escritura. */
export async function planBuild(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = mergeStateIntoPlanInput(asRow(args), context.recommendationState);
  const components = asRow(input.components);
  const criteria = getBuildRecommendationCriteria(input);
  const requirementsFromInput = Object.fromEntries(
    BUILD_SLOTS.map((slot) => [slot, getBuildRequirement(components[slot])]),
  ) as Record<BuildSlot, BuildComponentRequirement | null>;
  const fixedRequirements = Object.fromEntries(
    BUILD_SLOTS.filter((slot) => requirementsFromInput[slot]).map((slot) => [slot, requirementsFromInput[slot]]),
  ) as Partial<Record<BuildSlot, BuildComponentRequirement>>;
  const hasExplicitComponents = BUILD_SLOTS.every((slot) => requirementsFromInput[slot] !== null);

  if (context.recommendationState?.phase === "collecting" && context.recommendationState.missingFields.length > 0 && !hasExplicitComponents) {
    return {
      ok: true,
      data: { status: "needs_criteria", message: getRecommendationStateMessage(context.recommendationState), missingFields: context.recommendationState.missingFields },
      recommendationState: context.recommendationState,
    };
  }

  if (!hasExplicitComponents && criteria) {
    const recommended = await resolveRecommendedBuild(criteria, context, fixedRequirements);
    if (recommended.error || !recommended.rows) return { ok: false, error: recommended.error || "No pude generar una build con esos criterios." };

    const componentIds = Object.fromEntries(BUILD_SLOTS.map((slot) => [slot, asText(recommended.rows![slot].id)])) as Required<ActionComponentIds>;
    const fetched = await fetchProducts(context, Object.values(componentIds));
    if (fetched.error) return { ok: false, error: fetched.error };
    const compatibilityError = validateProductSet(fetched.rows, componentIds, BUILD_SLOTS);
    if (compatibilityError) return { ok: false, error: compatibilityError };
    const requirements = Object.fromEntries(BUILD_SLOTS.map((slot) => [slot, fixedRequirements[slot] || {
      query: asText(recommended.rows![slot].name),
      priceMode: "catalog",
    }])) as Record<BuildSlot, BuildComponentRequirement>;
    const buildDraft = createBuildDraft({ currency: criteria.currency }, requirements, fetched.rows, componentIds);
    const total = BUILD_SLOTS.reduce((sum, slot) => sum + getEffectiveRequirementPrice(recommended.rows![slot], requirements[slot], criteria.currency), 0);
    const recommendationState = markRecommendationPlanned(context.recommendationState);

    return {
      ok: true,
      data: {
        status: "planned",
        message: `${getBuildPlanMessage(buildDraft)}\n\n${getRecommendationBudgetMessage(total, criteria)}`,
        criteria,
        estimatedTotal: Number(total.toFixed(2)),
        budgetDifference: Number((criteria.budget - total).toFixed(2)),
        resolvedComponents: getComponentSummary(fetched.rows, componentIds, BUILD_SLOTS),
        instruction: "Presenta la build y sus criterios en texto; espera cambios o una orden explícita de guardado.",
      },
      buildDraft,
      ...(recommendationState ? { recommendationState } : {}),
    };
  }

  const requirements = Object.fromEntries(
    BUILD_SLOTS.map((slot) => [slot, getBuildRequirement(components[slot])]),
  ) as Record<BuildRequirementSlot, BuildComponentRequirement | null>;
  const missing = BUILD_SLOTS.filter((slot) => !requirements[slot]);
  if (missing.length > 0) return { ok: false, error: `Faltan requisitos para: ${missing.join(", ")}.` };

  const resolved = await Promise.all(BUILD_SLOTS.map(async (slot) => ({
    slot,
    requirement: requirements[slot] as BuildComponentRequirement,
    result: await resolveBuildComponent(slot, requirements[slot] as BuildComponentRequirement, context),
  })));

  const failures = resolved.filter((entry) => entry.result.error);
  if (failures.length > 0) {
    return {
      ok: false,
      error: failures.map((entry) => entry.result.error).join(" "),
    };
  }

  const ambiguous = resolved.filter((entry) => entry.result.candidates?.length);
  if (ambiguous.length > 0) {
    return {
      ok: true,
      data: {
        status: "needs_clarification",
        message: "Necesito que elijas un componente concreto antes de preparar la build.",
        slots: ambiguous.map((entry) => ({
          slot: entry.slot,
          query: entry.requirement.query,
          candidates: entry.result.candidates?.slice(0, 4).map((row) => ({
            id: asText(row.id),
            name: asText(row.name),
            brand: asText(row.brand),
            type: asText(row.type),
            prices: { USD: getProductPrice(row, "USD"), EUR: getProductPrice(row, "EUR") },
          })),
        })),
      },
    };
  }

  const componentIds = Object.fromEntries(
    resolved.map((entry) => [entry.slot, asText(entry.result.row?.id)]),
  ) as Required<ActionComponentIds>;
  const fetched = await fetchProducts(context, Object.values(componentIds));
  if (fetched.error) return { ok: false, error: fetched.error };
  const compatibilityError = validateProductSet(fetched.rows, componentIds, BUILD_SLOTS);
  if (compatibilityError) return { ok: false, error: compatibilityError };
  const requirementsBySlot = Object.fromEntries(resolved.map((entry) => [entry.slot, entry.requirement])) as Record<BuildSlot, BuildComponentRequirement>;
  const buildDraft = createBuildDraft(input, requirementsBySlot, fetched.rows, componentIds);
  const recommendationState = markRecommendationPlanned(context.recommendationState);

  return {
    ok: true,
    data: {
      status: "planned",
      message: getBuildPlanMessage(buildDraft),
      resolvedComponents: getComponentSummary(fetched.rows, componentIds, BUILD_SLOTS),
      instruction: "Presenta la build en texto y espera cambios o una orden explícita de guardado.",
    },
    buildDraft,
    ...(recommendationState ? { recommendationState } : {}),
  };
}

/** Aplica únicamente los slots solicitados sobre el borrador actual. */
export async function updateBuildPlan(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const draft = context.buildDraft;
  if (!draft) return { ok: false, error: "No hay una build activa que modificar." };

  const input = asRow(args);
  const changes = asRow(input.changes);
  const requirements = getDraftRequirements(draft);
  const changedSlots = BUILD_SLOTS.filter((slot) => Object.keys(asRow(changes[slot])).length > 0);
  if (changedSlots.length === 0) return { ok: false, error: "Indica al menos un componente que quieras cambiar." };

  const resolvedChanges = await Promise.all(changedSlots.map(async (slot) => ({
    slot,
    requirement: getBuildRequirement(changes[slot]),
    result: await resolveBuildComponent(slot, getBuildRequirement(changes[slot]) || { query: "" }, context),
  })));
  const failedChange = resolvedChanges.find((entry) => !entry.requirement || entry.result.error || !entry.result.row);
  if (failedChange) return { ok: false, error: failedChange.result.error || `No pude resolver el componente ${failedChange.slot}.` };

  for (const entry of resolvedChanges) {
    requirements[entry.slot] = entry.requirement as BuildComponentRequirement;
  }
  const componentIds = getDraftComponentIds(draft);
  for (const entry of resolvedChanges) componentIds[entry.slot] = asText(entry.result.row?.id);

  const fetched = await fetchProducts(context, Object.values(componentIds));
  if (fetched.error) return { ok: false, error: fetched.error };
  const compatibilityError = validateProductSet(fetched.rows, componentIds, BUILD_SLOTS);
  if (compatibilityError) return { ok: false, error: compatibilityError };

  const nextDraft = createBuildDraft({
    title: draft.title,
    category: draft.category,
    currency: draft.currency,
  }, requirements, fetched.rows, componentIds);
  return {
    ok: true,
    data: {
      status: "planned",
      message: `He actualizado solo ${resolvedChanges.map((entry) => entry.slot).join(" y ")}.\n\n${getBuildPlanMessage(nextDraft)}`,
      instruction: "Presenta la build actualizada en texto y espera más cambios o una orden explícita de guardado.",
    },
    buildDraft: nextDraft,
  };
}

/** Convierte el borrador validado en una propuesta firmada, pero nunca guarda directamente. */
export async function saveBuildDraft(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const denied = requirePermanentAccount(context);
  if (denied) return denied;
  const draft = context.buildDraft;
  if (!draft) return { ok: false, error: "No hay una build planificada para guardar." };

  const input = asRow(args);
  const title = sanitizeTitle(input.title, "");
  if (title.length < 3) {
    return {
      ok: true,
      data: { status: "needs_title", message: "¿Qué título quieres ponerle a esta build?" },
       buildDraft: { ...draft, awaitingTitle: true, awaitingSaveConfirmation: false, saveState: "awaiting_title" },
    };
  }

  const componentIds = getDraftComponentIds(draft);
  const fetched = await fetchProducts(context, Object.values(componentIds));
  if (fetched.error) return { ok: false, error: fetched.error };
  const compatibilityError = validateProductSet(fetched.rows, componentIds, BUILD_SLOTS);
  if (compatibilityError) return { ok: false, error: compatibilityError };

  if (input.prepareOnly === true) {
    return {
      ok: true,
      data: { status: "awaiting_save_confirmation", message: `¿Guardamos la build «${title}»?` },
      buildDraft: { ...draft, title, awaitingTitle: false, awaitingSaveConfirmation: true, saveState: "awaiting_save_confirmation" },
    };
  }

  const titledDraft: BuildDraft = { ...draft, title, awaitingTitle: false, awaitingSaveConfirmation: false, saveState: "ready" };
  const payload: CreateBuildActionPayload = {
    title,
    category: sanitizeCategory(input.category || draft.category),
    componentIds,
    customPrices: getDraftCustomPrices(titledDraft),
  };
  const action = await createPendingAction(context, "create_build", payload, "Crear build personalizada", {
    entityTitle: payload.title,
    entityType: "build",
    components: getComponentSummary(fetched.rows, componentIds, BUILD_SLOTS),
  });
  return {
    ok: true,
    data: { status: "pending_confirmation", instruction: "Presenta el resumen y pide confirmación explícita; todavía no se ha guardado nada." },
    pendingAction: action,
    buildDraft: titledDraft,
  };
}

function createComboDraft(
  input: Row,
  requirements: Record<ComboSlot, BuildComponentRequirement>,
  rows: Row[],
  componentIds: Pick<ActionComponentIds, ComboSlot>,
): ComboDraft {
  const byId = new Map(rows.map((row) => [asText(row.id), row]));
  const components = Object.fromEntries(COMBO_SLOTS.map((slot) => {
    const row = byId.get(componentIds[slot] || "");
    const requirement = requirements[slot];
    return [slot, {
      id: componentIds[slot] || "",
      name: asText(row?.name),
      type: slot,
      query: requirement.query,
      priceMode: requirement.priceMode || "catalog",
      ...(requirement.owned ? { owned: true } : {}),
      ...(requirement.customPrice !== undefined ? { customPrice: requirement.customPrice } : {}),
    } satisfies ComboDraftComponent];
  })) as Record<ComboSlot, ComboDraftComponent>;

  return {
    ...(asText(input.title).trim() ? { title: sanitizeTitle(input.title, "") } : {}),
    category: sanitizeCategory(input.category),
    saveState: "ready",
    currency: input.currency === "EUR" ? "EUR" : "USD",
    components,
  };
}

function getComboDraftComponentIds(draft: ComboDraft): Pick<ActionComponentIds, ComboSlot> {
  return Object.fromEntries(COMBO_SLOTS.map((slot) => [slot, draft.components[slot].id])) as Pick<ActionComponentIds, ComboSlot>;
}

function getComboDraftRequirements(draft: ComboDraft): Record<ComboSlot, BuildComponentRequirement> {
  return Object.fromEntries(COMBO_SLOTS.map((slot) => {
    const component = draft.components[slot];
    return [slot, {
      query: component.query,
      priceMode: component.priceMode,
      ...(component.owned ? { owned: true } : {}),
      ...(component.customPrice !== undefined ? { customPrice: component.customPrice } : {}),
    }];
  })) as Record<ComboSlot, BuildComponentRequirement>;
}

function getComboDraftCustomPrices(draft: ComboDraft): ActionPrices {
  const customPrices: ActionPrices = {};
  for (const slot of COMBO_SLOTS) {
    const component = draft.components[slot];
    if (component.priceMode === "custom" && component.customPrice !== undefined) {
      customPrices[slot] = { [draft.currency]: component.customPrice };
    }
  }
  return customPrices;
}

function getComboPlanMessage(draft: ComboDraft): string {
  const labels: Record<ComboSlot, string> = { cpu: "CPU", gpu: "GPU", ram: "RAM" };
  const title = draft.title ? `Combo «${draft.title}»` : "Combo propuesto";
  return `${title}:\n${COMBO_SLOTS.map((slot) => `${labels[slot]}: ${draft.components[slot].name}`).join("\n")}\n\n¿Quieres cambiar algún componente o procedemos con este combo?`;
}

function getRecommendationBudgetMessage(total: number, criteria: BuildRecommendationCriteria): string {
  const difference = Number((criteria.budget - total).toFixed(2));
  const currency = criteria.currency;
  if (difference >= 0) return `Total estimado: ${total.toFixed(2)} ${currency}. Quedan ${difference.toFixed(2)} ${currency} del presupuesto.`;
  return `Total estimado: ${total.toFixed(2)} ${currency}. Supera el presupuesto en ${Math.abs(difference).toFixed(2)} ${currency}, dentro de la tolerancia máxima del 5%.`;
}

async function resolveRecommendedCombo(
  criteria: BuildRecommendationCriteria,
  context: AiToolContext,
  fixedRequirements: Partial<Record<ComboSlot, BuildComponentRequirement>> = {},
): Promise<{ rows?: Record<ComboSlot, Row>; error?: string }> {
  const select = "id,name,brand,slug,type,specs,compatibility,price_usd,price_eur,price_base_usd,price_base_eur,priority,release_year,market_segment";
  const results = await Promise.all(COMBO_SLOTS.map(async (slot) => {
    const { data, error } = await context.supabase.from("products_with_priority").select(select).eq("type", slot).limit(100);
    return { slot, data, error };
  }));
  const fixedRows = await Promise.all(Object.entries(fixedRequirements).map(async ([slot, requirement]) => ({
    slot: slot as ComboSlot,
    result: await resolveBuildComponent(slot as ComboSlot, requirement, context),
  })));
  const fixedFailure = fixedRows.find((entry) => entry.result.error || !entry.result.row);
  if (fixedFailure) return { error: fixedFailure.result.error || `No pude resolver el componente ${fixedFailure.slot}.` };
  const fixedBySlot = new Map(fixedRows.map((entry) => [entry.slot, entry.result.row as Row]));
  const fixedMarketFailure = fixedRows.find((entry) => entry.result.row && !isMarketEligible(entry.result.row, entry.slot, criteria.market));
  if (fixedMarketFailure) {
    return { error: `${asText(fixedMarketFailure.result.row?.name)} no cumple las reglas del mercado ${criteria.market === "new" ? "nuevo" : "usado"}.` };
  }
  const candidates = Object.fromEntries(results.map(({ slot, data }) => [
    slot,
    fixedBySlot.has(slot)
      ? [fixedBySlot.get(slot)!]
      : getRecommendationCandidates(data, slot, criteria),
  ])) as Record<ComboSlot, Row[]>;
  const failedSlot = results.find(({ error }) => error)?.slot;
  if (failedSlot) return { error: `No se pudo consultar el catálogo para ${failedSlot}.` };
  const emptySlot = COMBO_SLOTS.find((slot) => candidates[slot].length === 0);
  if (emptySlot) return { error: `No hay candidatos con precio válido para ${emptySlot}.` };

  const budgetLimit = getRecommendationBudgetLimit(criteria);
  let best: { rows: Record<ComboSlot, Row>; total: number; score: number } | undefined;
  for (const cpu of candidates.cpu) {
    for (const gpu of candidates.gpu) {
      for (const ram of candidates.ram) {
        if (!isCompatibleCpuRam(cpu, ram)) continue;
        const total = getEffectiveRequirementPrice(cpu, fixedRequirements.cpu, criteria.currency)
          + getEffectiveRequirementPrice(gpu, fixedRequirements.gpu, criteria.currency)
          + getEffectiveRequirementPrice(ram, fixedRequirements.ram, criteria.currency);
        if (total > budgetLimit) continue;
        const score = getRecommendationScore(cpu, criteria) * 2.2
          + getRecommendationScore(gpu, criteria) * 2.8
          + getRecommendationScore(ram, criteria) * 0.8;
        if (!best) {
          best = { rows: { cpu, gpu, ram }, total, score };
          continue;
        }
        const scoreTolerance = Math.max(0.25, Math.abs(best.score) * COMBO_SCORE_RELATIVE_TOLERANCE);
        const scoreIsMeaningfullyBetter = score > best.score + scoreTolerance;
        const scoreIsClose = Math.abs(score - best.score) <= scoreTolerance;
        const budgetDistance = Math.abs(criteria.budget - total);
        const bestBudgetDistance = Math.abs(criteria.budget - best.total);
        if (scoreIsMeaningfullyBetter || (scoreIsClose && (budgetDistance < bestBudgetDistance || (budgetDistance === bestBudgetDistance && total < best.total)))) {
          best = { rows: { cpu, gpu, ram }, total, score };
        }
      }
    }
  }
  if (!best) return { error: `No encontré un combo compatible dentro del presupuesto indicado, incluso con la tolerancia del ${RECOMMENDATION_BUDGET_TOLERANCE * 100}%.` };
  return { rows: best.rows };
}

function getComboRecommendationCriteria(input: Row): BuildRecommendationCriteria | null {
  return getBuildRecommendationCriteria(input);
}

export async function planCombo(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = mergeStateIntoPlanInput(asRow(args), context.recommendationState);
  const components = asRow(input.components);
  const requirements = Object.fromEntries(
    COMBO_SLOTS.map((slot) => [slot, getBuildRequirement(components[slot])]),
  ) as Record<ComboSlot, BuildComponentRequirement | null>;
  const missing = COMBO_SLOTS.filter((slot) => !requirements[slot]);
  const criteria = getComboRecommendationCriteria(input);
  const fixedRequirements = Object.fromEntries(
    COMBO_SLOTS.filter((slot) => requirements[slot]).map((slot) => [slot, requirements[slot]]),
  ) as Partial<Record<ComboSlot, BuildComponentRequirement>>;
  const hasExplicitComponents = COMBO_SLOTS.every((slot) => requirements[slot] !== null);

  if (context.recommendationState?.phase === "collecting" && context.recommendationState.missingFields.length > 0 && !hasExplicitComponents) {
    return {
      ok: true,
      data: { status: "needs_criteria", message: getRecommendationStateMessage(context.recommendationState), missingFields: context.recommendationState.missingFields },
      recommendationState: context.recommendationState,
    };
  }

  if (missing.length > 0 && criteria) {
    const recommended = await resolveRecommendedCombo(criteria, context, fixedRequirements);
    if (recommended.error || !recommended.rows) return { ok: false, error: recommended.error || "No pude generar un combo con esos criterios." };
    const componentIds = Object.fromEntries(COMBO_SLOTS.map((slot) => [slot, asText(recommended.rows![slot].id)])) as Pick<ActionComponentIds, ComboSlot>;
    const fetched = await fetchProducts(context, Object.values(componentIds));
    if (fetched.error) return { ok: false, error: fetched.error };
    const compatibilityError = validateProductSet(fetched.rows, componentIds as Required<ActionComponentIds>, COMBO_SLOTS);
    if (compatibilityError) return { ok: false, error: compatibilityError };
    const requirementsBySlot = Object.fromEntries(COMBO_SLOTS.map((slot) => [slot, fixedRequirements[slot] || { query: asText(recommended.rows![slot].name), priceMode: "catalog" }])) as Record<ComboSlot, BuildComponentRequirement>;
    const comboDraft = createComboDraft({ currency: criteria.currency }, requirementsBySlot, fetched.rows, componentIds);
    const total = COMBO_SLOTS.reduce((sum, slot) => sum + getEffectiveRequirementPrice(recommended.rows![slot], requirementsBySlot[slot], criteria.currency), 0);
    return {
      ok: true,
      data: { status: "planned", message: `${getComboPlanMessage(comboDraft)}\n\n${getRecommendationBudgetMessage(total, criteria)}`, criteria, estimatedTotal: Number(total.toFixed(2)), budgetDifference: Number((criteria.budget - total).toFixed(2)), instruction: "Presenta el combo y espera cambios o una orden explícita de guardado." },
      comboDraft,
      ...(context.recommendationState ? { recommendationState: markRecommendationPlanned(context.recommendationState) } : {}),
    };
  }
  if (missing.length > 0) return { ok: false, error: `Faltan requisitos para: ${missing.join(", ")}.` };

  const resolved = await Promise.all(COMBO_SLOTS.map(async (slot) => ({
    slot,
    requirement: requirements[slot] as BuildComponentRequirement,
    result: await resolveBuildComponent(slot, requirements[slot] as BuildComponentRequirement, context),
  })));
  const failures = resolved.filter((entry) => entry.result.error || !entry.result.row);
  if (failures.length > 0) return { ok: false, error: failures.map((entry) => entry.result.error || `No encontré un componente ${entry.slot}.`).join(" ") };

  const componentIds = Object.fromEntries(resolved.map((entry) => [entry.slot, asText(entry.result.row?.id)])) as Pick<ActionComponentIds, ComboSlot>;
  const fetched = await fetchProducts(context, Object.values(componentIds));
  if (fetched.error) return { ok: false, error: fetched.error };
  const compatibilityError = validateProductSet(fetched.rows, componentIds, COMBO_SLOTS);
  if (compatibilityError) return { ok: false, error: compatibilityError };
  const requirementsBySlot = Object.fromEntries(resolved.map((entry) => [entry.slot, entry.requirement])) as Record<ComboSlot, BuildComponentRequirement>;
  const comboDraft = createComboDraft(input, requirementsBySlot, fetched.rows, componentIds);
  return {
    ok: true,
    data: {
      status: "planned",
      message: getComboPlanMessage(comboDraft),
      resolvedComponents: getComponentSummary(fetched.rows, componentIds as Required<ActionComponentIds>, COMBO_SLOTS),
      instruction: "Presenta el combo en texto y espera cambios o una orden explícita de guardado.",
    },
    comboDraft,
    ...(context.recommendationState ? { recommendationState: markRecommendationPlanned(context.recommendationState) } : {}),
  };
}

export async function updateComboPlan(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const draft = context.comboDraft;
  if (!draft) return { ok: false, error: "No hay un combo activo que modificar." };
  const changes = asRow(asRow(args).changes);
  const changedSlots = COMBO_SLOTS.filter((slot) => Object.keys(asRow(changes[slot])).length > 0);
  if (changedSlots.length === 0) return { ok: false, error: "Indica al menos un componente que quieras cambiar." };
  const requirements = getComboDraftRequirements(draft);
  const resolvedChanges = await Promise.all(changedSlots.map(async (slot) => {
    const requirement = getBuildRequirement(changes[slot]);
    return { slot, requirement, result: await resolveBuildComponent(slot, requirement || { query: "" }, context) };
  }));
  const failed = resolvedChanges.find((entry) => !entry.requirement || entry.result.error || !entry.result.row);
  if (failed) return { ok: false, error: failed.result.error || `No pude resolver el componente ${failed.slot}.` };
  for (const entry of resolvedChanges) requirements[entry.slot] = entry.requirement as BuildComponentRequirement;
  const componentIds = getComboDraftComponentIds(draft);
  for (const entry of resolvedChanges) componentIds[entry.slot] = asText(entry.result.row?.id);
  const fetched = await fetchProducts(context, Object.values(componentIds));
  if (fetched.error) return { ok: false, error: fetched.error };
  const compatibilityError = validateProductSet(fetched.rows, componentIds as Required<ActionComponentIds>, COMBO_SLOTS);
  if (compatibilityError) return { ok: false, error: compatibilityError };
  const nextDraft = createComboDraft({ title: draft.title, category: draft.category, currency: draft.currency }, requirements, fetched.rows, componentIds);
  return {
    ok: true,
    data: { status: "planned", message: `He actualizado solo ${resolvedChanges.map((entry) => entry.slot).join(" y ")} .\n\n${getComboPlanMessage(nextDraft)}` },
    comboDraft: nextDraft,
  };
}

export async function saveComboDraft(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const denied = requirePermanentAccount(context);
  if (denied) return denied;
  const draft = context.comboDraft;
  if (!draft) return { ok: false, error: "No hay un combo planificado para guardar." };
  const title = sanitizeTitle(asRow(args).title, "");
   if (title.length < 3) return { ok: true, data: { status: "needs_title", message: "¿Qué título quieres ponerle a este combo?" }, comboDraft: { ...draft, awaitingTitle: true, awaitingSaveConfirmation: false, saveState: "awaiting_title" } };
  const componentIds = getComboDraftComponentIds(draft);
  const fetched = await fetchProducts(context, Object.values(componentIds));
  if (fetched.error) return { ok: false, error: fetched.error };
  const compatibilityError = validateProductSet(fetched.rows, componentIds as Required<ActionComponentIds>, COMBO_SLOTS);
  if (compatibilityError) return { ok: false, error: compatibilityError };
  if (asRow(args).prepareOnly === true) {
    return {
      ok: true,
      data: { status: "awaiting_save_confirmation", message: `¿Guardamos el combo «${title}»?` },
      comboDraft: { ...draft, title, awaitingTitle: false, awaitingSaveConfirmation: true, saveState: "awaiting_save_confirmation" },
    };
  }
  const titledDraft: ComboDraft = { ...draft, title, awaitingTitle: false, awaitingSaveConfirmation: false, saveState: "ready" };
  const payload: CreateComboActionPayload = {
    title,
    componentIds,
    customPrices: getComboDraftCustomPrices(titledDraft),
  };
  const action = await createPendingAction(context, "create_combo", payload, "Crear combo personalizado", {
    entityTitle: title,
    entityType: "combo",
    components: getComponentSummary(fetched.rows, componentIds as Required<ActionComponentIds>, COMBO_SLOTS),
  });
  return { ok: true, data: { status: "pending_confirmation", instruction: "Presenta el resumen y pide confirmación explícita; todavía no se ha guardado nada." }, pendingAction: action, comboDraft: titledDraft };
}

export async function proposeSetCustomPrice(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const denied = requirePermanentAccount(context);
  if (denied) return denied;
  const input = asRow(args);
  const entityType = input.entityType === "build" ? "build" : input.entityType === "combo" ? "combo" : null;
  const slot = asText(input.slot).toLowerCase() as ActionSlot;
  const currency = input.currency === "EUR" ? "EUR" : input.currency === "USD" ? "USD" : null;
  const price = Number(input.price);
  if (!entityType || ![...BUILD_SLOTS].includes(slot) || (entityType === "combo" && !COMBO_SLOTS.includes(slot as ComboSlot))) {
    return { ok: false, error: "La entidad o el componente de precio no son válidos." };
  }
  if (!currency || !Number.isFinite(price) || price <= 0 || price > 1_000_000) return { ok: false, error: "El precio debe ser positivo y estar dentro de un rango válido." };
  const entityId = asText(input.entityId).trim().slice(0, 120);
  if (!entityId) return { ok: false, error: "Falta el identificador de la entidad." };
  const table = entityType === "combo" ? "created_combos" : "created_builds";
  const { data, error } = await context.supabase.from(table).select("id,title").eq("id", entityId).eq("user_id", context.actor.id).maybeSingle();
  if (error || !data) return { ok: false, error: "No encontré una entidad propia con ese identificador." };

  const payload: SetCustomPriceActionPayload = { entityType, entityId, slot, currency, price: Number(price.toFixed(2)) };
  const action = await createPendingAction(context, "set_custom_price", payload, "Cambiar precio personalizado", {
    entityTitle: asText(data.title),
    entityType,
    targetId: entityId,
    slot,
    currency,
    price: payload.price,
  });
  return { ok: true, data: { pendingAction: action, instruction: "Presenta el precio y pide confirmación explícita; todavía no se ha modificado nada." }, pendingAction: action };
}

function slugify(value: string, fallback: string): string {
  const slug = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function getActionPayload(value: unknown): Row | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Row;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Row : null;
  } catch {
    return null;
  }
}

function getRpcAction(value: unknown): { actionType: AiActionType; payload: PendingActionPayload } | null {
  const result = Array.isArray(value) ? value[0] : value;
  const candidate = asRow(result);
  const row = candidate.action_type === undefined && candidate.payload === undefined && candidate.data !== undefined
    ? asRow(candidate.data)
    : candidate;
  const actionType = asText(row.action_type) as AiActionType;
  const payload = getActionPayload(row.payload);
  return ACTION_TYPES.has(actionType) && payload
    ? { actionType, payload: payload as unknown as PendingActionPayload }
    : null;
}

function getPricePayload(prices: ActionPrices, slot: ActionSlot, currency: "USD" | "EUR"): number | null {
  const price = prices[slot]?.[currency];
  return typeof price === "number" && Number.isFinite(price) && price > 0 && price <= 1_000_000 ? price : null;
}

async function insertCreatedEntity(context: AiToolContext, type: "combo" | "build", payload: CreateComboActionPayload | CreateBuildActionPayload, actionId: string) {
  const slots = type === "combo" ? COMBO_SLOTS : BUILD_SLOTS;
  const table = type === "combo" ? "created_combos" : "created_builds";
  const { data: existing, error: existingError } = await context.supabase
    .from(table)
    .select("id,title")
    .eq("user_id", context.actor.id)
    .eq("ai_pending_action_id", actionId)
    .maybeSingle();
  if (existingError) throw new Error("No se pudo comprobar el estado del guardado.");
  if (existing && typeof existing.title === "string") return existing.title;

  const fetched = await fetchProducts(context, Object.values(payload.componentIds));
  if (fetched.error) throw new Error(fetched.error);
  const compatibilityError = validateProductSet(fetched.rows, payload.componentIds, slots);
  if (compatibilityError) throw new Error(compatibilityError);

  const base = {
    user_id: context.actor.id,
    ai_pending_action_id: actionId,
    title: sanitizeTitle(payload.title, type === "combo" ? "Combo" : "Build"),
    slug: `${slugify(payload.title, type)}-${crypto.randomUUID().slice(0, 8)}`,
    ...Object.fromEntries(slots.map((slot) => [`${slot}_id`, (payload.componentIds as ActionComponentIds)[slot]])),
  } as Record<string, unknown>;
  if (type === "build") {
    base.category = sanitizeCategory((payload as CreateBuildActionPayload).category);
    base.is_active = false;
  }
  for (const slot of slots) {
    for (const currency of ["USD", "EUR"] as const) {
      base[`custom_price_${slot}_${currency.toLowerCase()}`] = getPricePayload(payload.customPrices, slot, currency);
    }
  }

  const { error } = await context.supabase.from(table).insert(base);
  if (error) {
    throw new AiActionExecutionError(
      "vault_insert_failed",
      error.code,
      error.message.slice(0, 500),
    );
  }
  return base.title;
}

async function finalizePendingAction(context: AiToolContext, actionId: string): Promise<void> {
  const { error } = await context.supabase.rpc("finalize_ai_pending_action", { p_action_id: actionId });
  if (error) {
    throw new AiActionExecutionError(
      "pending_action_finalize_failed",
      error.code,
      error.message.slice(0, 500),
    );
  }
}

export async function confirmPendingAction(
  context: AiToolContext,
  actionId: string,
  digest: string,
): Promise<{ message: string }> {
  if (context.actor.isAnonymous) throw new Error("Las acciones sobre la bóveda requieren una cuenta registrada.");
  const { data, error } = await context.supabase.rpc("claim_ai_pending_action", {
    p_action_id: actionId,
    p_payload_digest: digest,
  });
  if (error) {
    if (error.code === "P0002") throw new Error("La propuesta ya fue utilizada, caducó o no pertenece a tu cuenta.");
    throw new Error("No se pudo validar la propuesta de acción.");
  }
  const action = getRpcAction(data);
  if (!action) {
    await context.supabase.rpc("fail_ai_pending_action", { p_action_id: actionId });
    throw new AiActionExecutionError(
      "pending_action_payload_invalid",
      undefined,
      undefined,
      "La propuesta de acción no es válida.",
    );
  }

  try {
    // The claim RPC already authenticates the exact stored digest, action owner,
    // expiry and status. Re-hashing the JSONB response here is unsafe because
    // PostgreSQL may return object keys in a different order than the original.

    if (action.actionType === "create_combo") {
      const title = await insertCreatedEntity(context, "combo", action.payload as CreateComboActionPayload, actionId);
      await finalizePendingAction(context, actionId);
      return { message: `El combo «${title}» se guardó en tu bóveda.` };
    }
    if (action.actionType === "create_build") {
      const title = await insertCreatedEntity(context, "build", action.payload as CreateBuildActionPayload, actionId);
      await finalizePendingAction(context, actionId);
      return { message: `La build «${title}» se guardó en tu bóveda.` };
    }

  const payload = action.payload as SetCustomPriceActionPayload;
  if (
    (payload.entityType !== "combo" && payload.entityType !== "build")
    || !BUILD_SLOTS.includes(payload.slot)
    || (payload.entityType === "combo" && !COMBO_SLOTS.includes(payload.slot as ComboSlot))
    || (payload.currency !== "USD" && payload.currency !== "EUR")
    || typeof payload.entityId !== "string"
    || !Number.isFinite(payload.price)
    || payload.price <= 0
    || payload.price > 1_000_000
  ) {
    throw new Error("La propuesta de precio no es válida.");
  }
  const table = payload.entityType === "combo" ? "created_combos" : "created_builds";
  const column = `custom_price_${payload.slot}_${payload.currency.toLowerCase()}`;
  const { error: updateError } = await context.supabase.from(table).update({ [column]: payload.price }).eq("id", payload.entityId).eq("user_id", context.actor.id);
  if (updateError) {
    throw new AiActionExecutionError(
      "vault_price_update_failed",
      updateError.code,
      updateError.message.slice(0, 500),
    );
  }
    await finalizePendingAction(context, actionId);
    return { message: `El precio personalizado de ${payload.slot} se actualizó a ${payload.price} ${payload.currency}.` };
  } catch (executionError) {
    await context.supabase.rpc("fail_ai_pending_action", { p_action_id: actionId });
    throw executionError;
  }
}
