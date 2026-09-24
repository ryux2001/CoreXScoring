import type {
  BuildRecommendationState,
  BuildSlot,
  ComboRecommendationState,
  ComboSlot,
  RecommendationComponentConstraint,
  RecommendationConstraints,
  RecommendationCriteria,
  RecommendationState,
  RecommendationUseCase,
  RecommendationPriority,
  RecommendationMarket,
} from "./types";

type Row = Record<string, unknown>;
type RecommendationSlot = BuildSlot | ComboSlot;

const BUILD_SLOTS: BuildSlot[] = ["cpu", "gpu", "ram", "motherboard", "storage", "psu"];
const COMBO_SLOTS: ComboSlot[] = ["cpu", "gpu", "ram"];

function asRow(value: unknown): Row {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function asText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function asNumber(value: unknown, maximum = 1_000_000): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= maximum ? Number(number.toFixed(2)) : undefined;
}

function asStringList(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.map((item) => asText(item, maxLength)).filter(Boolean);
  return values.length > 0 ? [...new Set(values)].slice(0, maxItems) : [];
}

function normalizeCriteria(value: unknown, previous: RecommendationCriteria = {}): RecommendationCriteria {
  const input = asRow(value);
  const useCase = ["gaming", "productivity", "creation", "balanced"].includes(String(input.useCase))
    ? input.useCase as RecommendationUseCase
    : previous.useCase;
  const priority = ["value", "performance", "balanced"].includes(String(input.priority))
    ? input.priority as RecommendationPriority
    : previous.priority;
  const resolution = ["1080p", "1440p", "4k"].includes(String(input.resolution))
    ? input.resolution as "1080p" | "1440p" | "4k"
    : previous.resolution;
  const currency = input.currency === "EUR" || input.currency === "USD" ? input.currency : previous.currency;
  const parsedBudget = input.budget !== undefined ? asNumber(input.budget) : undefined;
  const parsedFpsTarget = input.fpsTarget !== undefined ? asNumber(input.fpsTarget, 1_000) : undefined;
  const budget = parsedBudget ?? previous.budget;
  const fpsTarget = parsedFpsTarget ?? previous.fpsTarget;
  const preferences = input.preferences !== undefined ? asText(input.preferences, 500) : previous.preferences;
  const workloads = input.workloads !== undefined ? asStringList(input.workloads, 12, 100) : previous.workloads;

  return {
    ...(budget !== undefined ? { budget } : {}),
    ...(currency ? { currency } : {}),
    ...(useCase ? { useCase } : {}),
    ...(workloads ? { workloads } : {}),
    ...(resolution ? { resolution } : {}),
    ...(fpsTarget !== undefined ? { fpsTarget } : {}),
    ...(priority ? { priority } : {}),
    ...(preferences ? { preferences } : {}),
  };
}

function normalizeConstraint(value: unknown, previous?: RecommendationComponentConstraint): RecommendationComponentConstraint | undefined {
  const input = asRow(value);
  const query = asText(input.query ?? previous?.query, 120);
  if (!query) return previous;
  const role = ["required", "preferred", "owned", "excluded"].includes(String(input.role))
    ? input.role as RecommendationComponentConstraint["role"]
    : previous?.role || "required";
  const customPrice = input.customPrice !== undefined ? asNumber(input.customPrice) : previous?.customPrice;
  const currency = input.currency === "EUR" || input.currency === "USD" ? input.currency : previous?.currency;
  return {
    query,
    role,
    ...(customPrice !== undefined ? { customPrice } : {}),
    ...(currency ? { currency } : {}),
  };
}

function mergeConstraints<Slot extends RecommendationSlot>(
  slots: readonly Slot[],
  input: Row,
  previous: RecommendationConstraints<Slot> | undefined,
) {
  const source = asRow(input.components);
  const components = { ...(previous?.components || {}) } as Partial<Record<Slot, RecommendationComponentConstraint>>;
  for (const slot of slots) {
    if (source[slot] !== undefined) {
      const constraint = normalizeConstraint(source[slot], components[slot]);
      if (constraint) components[slot] = constraint;
    }
  }

  const excludedComponents = input.excludedComponents !== undefined
    ? asStringList(input.excludedComponents, 12, 120)
    : previous?.excludedComponents;
  const preferredBrands = input.preferredBrands !== undefined
    ? asStringList(input.preferredBrands, 12, 60)
    : previous?.preferredBrands;
  const market = ["new", "used"].includes(String(input.market))
    ? input.market as RecommendationMarket
    : previous?.market || "new";

  return {
    components,
    ...(excludedComponents ? { excludedComponents } : {}),
    ...(preferredBrands ? { preferredBrands } : {}),
    market,
  };
}

export function createRecommendationState(mode: "build" | "combo"): RecommendationState {
  const state = {
    version: 2 as const,
    mode,
    active: true as const,
    phase: "collecting" as const,
    criteria: {},
    constraints: { components: {}, market: "new" },
    missingFields: ["budget", "useCase"],
  } satisfies BuildRecommendationState | ComboRecommendationState;
  return state;
}

export function getRecommendationMissingFields(state: Pick<RecommendationState, "mode" | "criteria" | "constraints">): string[] {
  const componentSlots = state.mode === "build" ? BUILD_SLOTS : COMBO_SLOTS;
  const components = state.constraints.components as Partial<Record<RecommendationSlot, RecommendationComponentConstraint>>;
  const hasAllComponents = componentSlots.every((slot) => Boolean(components[slot]?.query));
  if (hasAllComponents) return [];

  const missing: string[] = [];
  if (state.criteria.budget === undefined) missing.push("budget");
  if (state.criteria.useCase === undefined) missing.push("useCase");
  if (state.criteria.useCase === "gaming" && state.criteria.resolution === undefined) missing.push("resolution");
  return missing;
}

export function mergeRecommendationState(
  current: RecommendationState | undefined,
  mode: "build" | "combo",
  patch: unknown,
): RecommendationState {
  const base = current?.mode === mode ? current : createRecommendationState(mode);
  const input = asRow(patch);
  const criteria = normalizeCriteria(input.criteria, base.criteria);
  const constraints = mergeConstraints(
    mode === "build" ? BUILD_SLOTS : COMBO_SLOTS,
    input,
    base.constraints,
  );
  const missingFields = getRecommendationMissingFields({ mode, criteria, constraints });
  return {
    version: 2,
    mode,
    active: true,
    phase: missingFields.length === 0 ? "ready" : "collecting",
    criteria,
    constraints,
    missingFields,
  } as RecommendationState;
}

export function normalizeRecommendationState(value: unknown): RecommendationState | undefined {
  const input = asRow(value);
  if (input.version !== 2 || (input.mode !== "build" && input.mode !== "combo")) return undefined;
  const constraints = asRow(input.constraints);
  const merged = mergeRecommendationState(undefined, input.mode, {
    criteria: input.criteria,
    components: constraints.components,
    excludedComponents: constraints.excludedComponents,
    preferredBrands: constraints.preferredBrands,
    market: constraints.market,
  });
  const phase = input.phase === "planned" ? "planned" : merged.phase;
  return { ...merged, phase };
}

export function markRecommendationPlanned(state: RecommendationState | undefined): RecommendationState | undefined {
  return state ? { ...state, phase: "planned", missingFields: [] } : undefined;
}

export function getStateCriteria(state: RecommendationState | undefined): RecommendationCriteria {
  return state?.criteria || {};
}

export function getStateComponents(state: RecommendationState | undefined): Partial<Record<RecommendationSlot, RecommendationComponentConstraint>> {
  return state?.constraints.components || {};
}

export function getRecommendationStateMessage(state: RecommendationState): string {
  if (state.missingFields.length === 0) {
    return state.mode === "build"
      ? "Ya tengo los criterios mínimos. Voy a preparar la build completa."
      : "Ya tengo los criterios mínimos. Voy a preparar el combo.";
  }

  const labels: Record<string, string> = {
    budget: "presupuesto total",
    useCase: "uso principal",
    resolution: "resolución objetivo",
  };
  const missing = state.missingFields.map((field) => labels[field] || field).join(", ");
  return `Para preparar la recomendación todavía necesito: ${missing}.`;
}

export function isActiveRecommendation(state: RecommendationState | undefined): boolean {
  return Boolean(state?.active && state.phase !== "planned");
}
