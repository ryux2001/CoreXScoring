import { createHmac } from "node:crypto";
import type { AiActionType, BuildDraft, BuildDraftComponent, BuildSlot, ComboDraft, ComboDraftComponent, ComboSlot, PendingAction, PendingActionComponent } from "./types";
import type { AiToolContext, AiToolResult } from "./tools/types";

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
}

export type PendingActionPayload =
  | CreateComboActionPayload
  | CreateBuildActionPayload
  | SetCustomPriceActionPayload;

export class AiActionExecutionError extends Error {
  constructor(
    readonly code: string,
    readonly databaseCode?: string,
    readonly databaseMessage?: string,
  ) {
    super("No se pudo guardar la entidad en la bóveda.");
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

function getComponentIds(value: unknown, slots: readonly BuildSlot[]): ActionComponentIds {
  const input = asRow(value);
  return Object.fromEntries(
    slots
      .map((slot) => [slot, asText(input[slot]).trim().slice(0, 120)] as const)
      .filter(([, id]) => id.length > 0),
  ) as ActionComponentIds;
}

function sanitizeTitle(value: unknown, fallback: string): string {
  return asText(value, fallback).trim().replace(/\s+/g, " ").slice(0, 80);
}

function sanitizeCategory(value: unknown): string {
  return asText(value, "Personalizada").trim().replace(/\s+/g, " ").slice(0, 60) || "Personalizada";
}

function parsePrices(value: unknown, slots: readonly ActionSlot[]): ActionPrices {
  const input = asRow(value);
  const prices: ActionPrices = {};
  for (const slot of slots) {
    const source = asRow(input[slot]);
    const normalized: { USD?: number; EUR?: number } = {};
    for (const currency of ["USD", "EUR"] as const) {
      const amount = Number(source[currency]);
      if (Number.isFinite(amount) && amount > 0 && amount <= 1_000_000) normalized[currency] = Number(amount.toFixed(2));
    }
    if (Object.keys(normalized).length > 0) prices[slot] = normalized;
  }
  return prices;
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
  return {
    query,
    priceMode,
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
    .select("id,name,brand,slug,type,specs,compatibility,price_base_usd,price_base_eur")
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
      const priceDifference = Number(left.row.price_base_usd || 0) - Number(right.row.price_base_usd || 0);
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

function getActionSecret(): string {
  const secret = process.env.AI_ACTION_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.GROQ_API_KEY?.trim();
  if (!secret) throw new Error("Falta configurar AI_ACTION_SECRET en el servidor.");
  return secret;
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
    .select("id,name,type,specs,compatibility,price_base_usd,price_base_eur")
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
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const digest = digestPayload(payload);
  const { data, error } = await context.supabase.rpc("create_ai_pending_action", {
    p_action_type: type,
    p_payload: payload,
    p_payload_digest: digest,
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

export async function proposeCreateCombo(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const denied = requirePermanentAccount(context);
  if (denied) return denied;
  const input = asRow(args);
  const componentIds = getComponentIds(input.componentIds, COMBO_SLOTS) as Pick<ActionComponentIds, ComboSlot>;
  const fetched = await fetchProducts(context, Object.values(componentIds));
  if (fetched.error) return { ok: false, error: fetched.error };
  const compatibilityError = validateProductSet(fetched.rows, componentIds, COMBO_SLOTS);
  if (compatibilityError) return { ok: false, error: compatibilityError };

  const payload: CreateComboActionPayload = {
    title: sanitizeTitle(input.title, "Combo propuesto"),
    componentIds,
    customPrices: parsePrices(input.customPrices, COMBO_SLOTS),
  };
  const action = await createPendingAction(context, "create_combo", payload, "Crear combo personalizado", {
    entityTitle: payload.title,
    entityType: "combo",
    components: getComponentSummary(fetched.rows, componentIds, COMBO_SLOTS),
  });
  return { ok: true, data: { pendingAction: action, instruction: "Presenta el resumen y pide confirmación explícita; todavía no se ha guardado nada." }, pendingAction: action };
}

export async function proposeCreateBuild(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const denied = requirePermanentAccount(context);
  if (denied) return denied;
  const input = asRow(args);
  const componentIds = getComponentIds(input.componentIds, BUILD_SLOTS) as Required<ActionComponentIds>;
  const fetched = await fetchProducts(context, Object.values(componentIds));
  if (fetched.error) return { ok: false, error: fetched.error };
  const compatibilityError = validateProductSet(fetched.rows, componentIds, BUILD_SLOTS);
  if (compatibilityError) return { ok: false, error: compatibilityError };

  const payload: CreateBuildActionPayload = {
    title: sanitizeTitle(input.title, "Build propuesta"),
    category: sanitizeCategory(input.category),
    componentIds,
    customPrices: parsePrices(input.customPrices, BUILD_SLOTS),
  };
  const action = await createPendingAction(context, "create_build", payload, "Crear build personalizada", {
    entityTitle: payload.title,
    entityType: "build",
    components: getComponentSummary(fetched.rows, componentIds, BUILD_SLOTS),
  });
  return { ok: true, data: { pendingAction: action, instruction: "Presenta el resumen y pide confirmación explícita; todavía no se ha guardado nada." }, pendingAction: action };
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
      ...(requirement.customPrice !== undefined ? { customPrice: requirement.customPrice } : {}),
    } satisfies BuildDraftComponent];
  })) as Record<BuildSlot, BuildDraftComponent>;

  return {
    ...(asText(input.title).trim() ? { title: sanitizeTitle(input.title, "") } : {}),
    category: sanitizeCategory(input.category),
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
  return `${title}:\n${BUILD_SLOTS.map((slot) => `${labels[slot]}: ${draft.components[slot].name}`).join("\n")}\n\nPuedes pedirme cambios antes de guardarla.`;
}

/** Resuelve y valida una build sin crear todavía una acción de escritura. */
export async function planBuild(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  const components = asRow(input.components);
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
            prices: { USD: row.price_base_usd ?? null, EUR: row.price_base_eur ?? null },
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

  return {
    ok: true,
    data: {
      status: "planned",
      message: getBuildPlanMessage(buildDraft),
      resolvedComponents: getComponentSummary(fetched.rows, componentIds, BUILD_SLOTS),
      instruction: "Presenta la build en texto y espera cambios o una orden explícita de guardado.",
    },
    buildDraft,
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
      buildDraft: { ...draft, awaitingTitle: true },
    };
  }

  const componentIds = getDraftComponentIds(draft);
  const fetched = await fetchProducts(context, Object.values(componentIds));
  if (fetched.error) return { ok: false, error: fetched.error };
  const compatibilityError = validateProductSet(fetched.rows, componentIds, BUILD_SLOTS);
  if (compatibilityError) return { ok: false, error: compatibilityError };

  const titledDraft: BuildDraft = { ...draft, title, awaitingTitle: false };
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
      ...(requirement.customPrice !== undefined ? { customPrice: requirement.customPrice } : {}),
    } satisfies ComboDraftComponent];
  })) as Record<ComboSlot, ComboDraftComponent>;

  return {
    ...(asText(input.title).trim() ? { title: sanitizeTitle(input.title, "") } : {}),
    category: sanitizeCategory(input.category),
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
  return `${title}:\n${COMBO_SLOTS.map((slot) => `${labels[slot]}: ${draft.components[slot].name}`).join("\n")}\n\nPuedes pedirme cambios antes de guardarlo.`;
}

export async function planCombo(args: unknown, context: AiToolContext): Promise<AiToolResult> {
  const input = asRow(args);
  const components = asRow(input.components);
  const requirements = Object.fromEntries(
    COMBO_SLOTS.map((slot) => [slot, getBuildRequirement(components[slot])]),
  ) as Record<ComboSlot, BuildComponentRequirement | null>;
  const missing = COMBO_SLOTS.filter((slot) => !requirements[slot]);
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
  if (title.length < 3) return { ok: true, data: { status: "needs_title", message: "¿Qué título quieres ponerle a este combo?" }, comboDraft: { ...draft, awaitingTitle: true } };
  const componentIds = getComboDraftComponentIds(draft);
  const fetched = await fetchProducts(context, Object.values(componentIds));
  if (fetched.error) return { ok: false, error: fetched.error };
  const compatibilityError = validateProductSet(fetched.rows, componentIds as Required<ActionComponentIds>, COMBO_SLOTS);
  if (compatibilityError) return { ok: false, error: compatibilityError };
  const titledDraft: ComboDraft = { ...draft, title, awaitingTitle: false };
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

function getRpcAction(value: unknown): { actionType: AiActionType; payload: PendingActionPayload } | null {
  const row = Array.isArray(value) ? asRow(value[0]) : asRow(value);
  const actionType = asText(row.action_type) as AiActionType;
  const payload = row.payload;
  return ACTION_TYPES.has(actionType) && payload && typeof payload === "object" && !Array.isArray(payload)
    ? { actionType, payload: payload as PendingActionPayload }
    : null;
}

function getPricePayload(prices: ActionPrices, slot: ActionSlot, currency: "USD" | "EUR"): number | null {
  const price = prices[slot]?.[currency];
  return typeof price === "number" && Number.isFinite(price) && price > 0 && price <= 1_000_000 ? price : null;
}

async function insertCreatedEntity(context: AiToolContext, type: "combo" | "build", payload: CreateComboActionPayload | CreateBuildActionPayload) {
  const slots = type === "combo" ? COMBO_SLOTS : BUILD_SLOTS;
  const fetched = await fetchProducts(context, Object.values(payload.componentIds));
  if (fetched.error) throw new Error(fetched.error);
  const compatibilityError = validateProductSet(fetched.rows, payload.componentIds, slots);
  if (compatibilityError) throw new Error(compatibilityError);

  const base = {
    user_id: context.actor.id,
    title: sanitizeTitle(payload.title, type === "combo" ? "Combo" : "Build"),
    slug: `${slugify(payload.title, type)}-${crypto.randomUUID().slice(0, 8)}`,
    ...Object.fromEntries(slots.map((slot) => [`${slot}_id`, (payload.componentIds as ActionComponentIds)[slot]])),
  } as Record<string, unknown>;
  if (type === "build") {
    base.category = sanitizeCategory((payload as CreateBuildActionPayload).category);
    base.is_active = true;
  }
  for (const slot of slots) {
    for (const currency of ["USD", "EUR"] as const) {
      base[`custom_price_${slot}_${currency.toLowerCase()}`] = getPricePayload(payload.customPrices, slot, currency);
    }
  }

  const { error } = await context.supabase.from(type === "combo" ? "created_combos" : "created_builds").insert(base);
  if (error) {
    throw new AiActionExecutionError(
      "vault_insert_failed",
      error.code,
      error.message.slice(0, 500),
    );
  }
  return base.title;
}

export async function confirmPendingAction(
  context: AiToolContext,
  actionId: string,
  digest: string,
): Promise<{ message: string }> {
  if (context.actor.isAnonymous) throw new Error("Las acciones sobre la bóveda requieren una cuenta registrada.");
  const { data, error } = await context.supabase.rpc("consume_ai_pending_action", {
    p_action_id: actionId,
    p_payload_digest: digest,
  });
  if (error) {
    if (error.code === "P0002") throw new Error("La propuesta ya fue utilizada, caducó o no pertenece a tu cuenta.");
    throw new Error("No se pudo validar la propuesta de acción.");
  }
  const action = getRpcAction(data);
  if (!action) throw new Error("La propuesta de acción no es válida.");

  if (action.actionType === "create_combo") {
    const title = await insertCreatedEntity(context, "combo", action.payload as CreateComboActionPayload);
    return { message: `El combo «${title}» se guardó en tu bóveda.` };
  }
  if (action.actionType === "create_build") {
    const title = await insertCreatedEntity(context, "build", action.payload as CreateBuildActionPayload);
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
  return { message: `El precio personalizado de ${payload.slot} se actualizó a ${payload.price} ${payload.currency}.` };
}
