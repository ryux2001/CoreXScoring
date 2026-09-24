import type { CatalogPriceEvaluation } from "@/lib/catalog/price-evaluation";

export const MAX_CHAT_MESSAGE_LENGTH = 4_000;
export const MAX_CHAT_HISTORY_MESSAGES = 12;
export const MAX_SAVED_CHAT_MESSAGES = 150;

export type ChatRole = "user" | "assistant";
export type ChatProvider = "local" | "groq" | "cerebras" | "openrouter" | "guardrail";
export type AiCredentialMode = "project" | "byok";
export type AiChatProvider = "groq" | "cerebras" | "openrouter";
export type AiConversationMode = "temporary" | "saved";

export type PageRoute = "home" | "catalog" | "comparator" | "combo" | "build" | "vault" | "other";
export type PageEntityType = "product" | "combo" | "build" | "saved_combo" | "saved_build";
export type BuildSlot = "cpu" | "gpu" | "ram" | "motherboard" | "storage" | "psu";
export type ComboSlot = "cpu" | "gpu" | "ram";
export type RecommendationUseCase = "gaming" | "productivity" | "creation" | "balanced";
export type RecommendationPriority = "value" | "performance" | "balanced";
export type RecommendationMarket = "new" | "used";
export type RecommendationComponentRole = "required" | "preferred" | "owned" | "excluded";
export type DraftSaveState = "ready" | "awaiting_title" | "awaiting_save_confirmation";
export type { CatalogPriceEvaluation } from "@/lib/catalog/price-evaluation";

export interface CatalogPriceEvaluationRequest {
  productId: string;
  price: number;
  currency: "USD" | "EUR";
  valueProfile?: "balanced" | "gaming" | "creation" | "productivity";
  qualityPriceScore?: number;
  source?: "base" | "manual" | "market" | "chat";
}

export interface PageContext {
  pathname: string;
  search?: string;
  title?: string;
  route?: PageRoute;
  identifier?: string;
  entityType?: PageEntityType;
  entityId?: string;
  entitySlug?: string;
  entityTitle?: string;
  entitySummary?: string;
  /** Internal marker set only after server-side entity resolution. */
  serverResolved?: true;
  /** Campos añadidos únicamente por el servidor después de resolver la ruta. */
  entityComponents?: Array<{ id: string; slot: string; customPriceUsd?: number; customPriceEur?: number }>;
  comparison?: ComparisonContext;
}

export interface ComparisonContext {
  itemIds: string[];
  componentType?: string;
}

export type AiPriceScope = "catalog" | "comparison" | "build" | "combo" | "draft_build" | "draft_combo";

export interface AiFrontendPriceItem {
  productId: string;
  price: number;
  isCustom: boolean;
  slot?: string;
}

/** Precios visibles en el cliente; el servidor vuelve a validar componentes y cálculos. */
export interface AiFrontendPriceContext {
  scope: AiPriceScope;
  currency: "USD" | "EUR";
  items: AiFrontendPriceItem[];
}

export interface AiResolvedPriceItem extends AiFrontendPriceItem {
  name: string;
  type: string;
  qualityPriceScore: number;
}

export interface AiResolvedPriceContext {
  scope: AiPriceScope;
  currency: "USD" | "EUR";
  items: AiResolvedPriceItem[];
  totalPrice: number;
}

export type ComparisonUiAction =
  | {
      type: "add";
      itemId: string;
      itemName: string;
      item: Record<string, unknown>;
    }
  | {
      type: "remove";
      itemId: string;
      itemName: string;
    }
  | {
      type: "set_price";
      itemId: string;
      itemName: string;
      price: number;
      currency: "USD" | "EUR";
    }
  | {
      /** Estado final validado para aplicar varias mutaciones locales de una vez. */
      type: "replace";
      items: Record<string, unknown>[];
      evaluatedPrices: Record<string, number>;
      summary: string;
    };

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface RecommendationCriteria {
  budget?: number;
  currency?: "USD" | "EUR";
  useCase?: RecommendationUseCase;
  workloads?: string[];
  resolution?: "1080p" | "1440p" | "4k";
  fpsTarget?: number;
  priority?: RecommendationPriority;
  preferences?: string;
}

export interface RecommendationComponentConstraint {
  query: string;
  role: RecommendationComponentRole;
  customPrice?: number;
  currency?: "USD" | "EUR";
}

export interface RecommendationConstraints<Slot extends string> {
  components: Partial<Record<Slot, RecommendationComponentConstraint>>;
  excludedComponents?: string[];
  preferredBrands?: string[];
  market?: RecommendationMarket;
}

export interface BuildRecommendationState {
  version: 2;
  mode: "build";
  active: true;
  phase: "collecting" | "ready" | "planned";
  criteria: RecommendationCriteria;
  constraints: RecommendationConstraints<BuildSlot>;
  missingFields: string[];
}

export interface ComboRecommendationState {
  version: 2;
  mode: "combo";
  active: true;
  phase: "collecting" | "ready" | "planned";
  criteria: RecommendationCriteria;
  constraints: RecommendationConstraints<ComboSlot>;
  missingFields: string[];
}

export type RecommendationState = BuildRecommendationState | ComboRecommendationState;

export interface PersistedConversationState {
  version: 1 | 2;
  buildDraft?: BuildDraft;
  comboDraft?: ComboDraft;
  recommendationState?: RecommendationState;
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

export interface ConversationMessage extends ChatMessage {
  id: number;
  createdAt: string;
}

export interface ConversationRecord extends ConversationSummary {
  state: PersistedConversationState;
  messages: ConversationMessage[];
}

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
}

export type AiActionType = "create_combo" | "create_build" | "set_custom_price";

export interface PendingActionComponent {
  slot: string;
  id: string;
  name: string;
  type: string;
}

export interface PendingAction {
  id: string;
  type: AiActionType;
  title: string;
  summary: {
    entityTitle?: string;
    components?: PendingActionComponent[];
    entityType?: "combo" | "build";
    targetId?: string;
    slot?: string;
    currency?: "USD" | "EUR";
    price?: number;
  };
  digest: string;
  expiresAt: string;
}

/** Borrador de build sin efectos persistentes; se revalida en cada operación de servidor. */
export interface BuildDraftComponent {
  id: string;
  name: string;
  type: BuildSlot;
  query: string;
  priceMode: "custom" | "catalog" | "msrp";
  customPrice?: number;
  owned?: boolean;
}

export interface BuildDraft {
  title?: string;
  awaitingTitle?: boolean;
  awaitingSaveConfirmation?: boolean;
  saveState?: DraftSaveState;
  category?: string;
  currency: "USD" | "EUR";
  components: Record<BuildSlot, BuildDraftComponent>;
}

export interface ComboDraftComponent {
  id: string;
  name: string;
  type: ComboSlot;
  query: string;
  priceMode: "custom" | "catalog" | "msrp";
  customPrice?: number;
  owned?: boolean;
}

export interface ComboDraft {
  title?: string;
  awaitingTitle?: boolean;
  awaitingSaveConfirmation?: boolean;
  saveState?: DraftSaveState;
  category?: string;
  currency: "USD" | "EUR";
  components: Record<ComboSlot, ComboDraftComponent>;
}

export interface AiActionRequest {
  id: string;
  digest: string;
}

export function getDraftSaveState(draft: Pick<BuildDraft | ComboDraft, "saveState" | "awaitingTitle" | "awaitingSaveConfirmation">): DraftSaveState {
  if (draft.saveState === "awaiting_save_confirmation" || draft.saveState === "awaiting_title" || draft.saveState === "ready") return draft.saveState;
  if (draft.awaitingSaveConfirmation === true) return "awaiting_save_confirmation";
  if (draft.awaitingTitle === true) return "awaiting_title";
  return "ready";
}

export interface ChatRequest {
  messages: ChatMessage[];
  /** Reenvía explícitamente el último turno fallido; permite deduplicar un turno guardado. */
  retry?: boolean;
  /** Solicita continuar la última respuesta sin crear un nuevo mensaje de usuario. */
  continuation?: boolean;
  conversationMode?: AiConversationMode;
  conversationId?: string;
  /** UUID aleatorio del navegador usado solo para afinidad de caché del proveedor. */
  cacheSessionId?: string;
  context?: PageContext;
  buildDraft?: BuildDraft;
  comboDraft?: ComboDraft;
  recommendationState?: RecommendationState;
  catalogPriceEvaluation?: CatalogPriceEvaluationRequest;
  frontendPriceContext?: AiFrontendPriceContext;
  turnstileToken?: string;
  action?: AiActionRequest;
}

export interface ChatResponse {
  message: ChatMessage;
  provider: ChatProvider;
  model: string;
  conversationId?: string;
  usage?: ChatUsage;
  toolCalls?: number;
  pendingAction?: PendingAction;
  buildDraft?: BuildDraft;
  comboDraft?: ComboDraft;
  /** Estado estructurado de una recomendación; null indica que se debe limpiar. */
  recommendationState?: RecommendationState | null;
  catalogPriceEvaluation?: CatalogPriceEvaluation;
  catalogPriceUpdate?: CatalogPriceEvaluation;
  comparisonAction?: ComparisonUiAction;
  /** El proveedor terminó por límite de salida; la interfaz puede pedir continuación. */
  truncated?: boolean;
}

export function isChatRequest(value: unknown): value is ChatRequest {
  if (!value || typeof value !== "object" || !Array.isArray((value as ChatRequest).messages)) {
    return false;
  }

  const { messages } = value as ChatRequest;
  if (messages.length === 0 || messages.length > MAX_CHAT_HISTORY_MESSAGES) {
    return false;
  }

  const context = (value as ChatRequest).context;
  if (context !== undefined && !isPageContext(context)) return false;

  const conversationMode = (value as ChatRequest).conversationMode;
  if (conversationMode !== undefined && !["temporary", "saved"].includes(conversationMode)) return false;
  const continuation = (value as ChatRequest).continuation;
  if (continuation !== undefined && typeof continuation !== "boolean") return false;
  const retry = (value as ChatRequest).retry;
  if (retry !== undefined && typeof retry !== "boolean") return false;
  const conversationId = (value as ChatRequest).conversationId;
  if (conversationId !== undefined && (typeof conversationId !== "string" || conversationId.length > 80)) return false;
  const cacheSessionId = (value as ChatRequest).cacheSessionId;
  if (cacheSessionId !== undefined && (typeof cacheSessionId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cacheSessionId))) return false;

  const buildDraft = (value as ChatRequest).buildDraft;
  if (buildDraft !== undefined && !isBuildDraft(buildDraft)) return false;
  const comboDraft = (value as ChatRequest).comboDraft;
  if (comboDraft !== undefined && !isComboDraft(comboDraft)) return false;
  const recommendationState = (value as ChatRequest).recommendationState;
  if (recommendationState !== undefined && !isRecommendationState(recommendationState)) return false;
  const catalogPriceEvaluation = (value as ChatRequest).catalogPriceEvaluation;
  if (catalogPriceEvaluation !== undefined && !isCatalogPriceEvaluationRequest(catalogPriceEvaluation)) return false;
  const frontendPriceContext = (value as ChatRequest).frontendPriceContext;
  if (frontendPriceContext !== undefined && !isFrontendPriceContext(frontendPriceContext)) return false;
  const turnstileToken = (value as ChatRequest).turnstileToken;
  if (turnstileToken !== undefined && (typeof turnstileToken !== "string" || turnstileToken.length === 0 || turnstileToken.length > 2_048)) return false;

  const action = (value as ChatRequest).action;
  if (action !== undefined && (
    !action
    || typeof action.id !== "string"
    || action.id.length > 120
    || typeof action.digest !== "string"
    || !/^[a-f0-9]{64}$/i.test(action.digest)
  )) return false;

  return messages.every((message) => (
    message
    && (message.role === "user" || message.role === "assistant")
    && typeof message.content === "string"
    && message.content.trim().length > 0
    && message.content.length <= MAX_CHAT_MESSAGE_LENGTH
  ));
}

function isRecommendationState(value: unknown): value is RecommendationState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as RecommendationState;
  if (state.version !== 2 || state.active !== true || (state.mode !== "build" && state.mode !== "combo")
    || !["collecting", "ready", "planned"].includes(state.phase)
    || !state.criteria || typeof state.criteria !== "object"
    || !state.constraints || typeof state.constraints !== "object"
    || !state.constraints.components || typeof state.constraints.components !== "object"
    || !Array.isArray(state.missingFields) || state.missingFields.length > 12
  ) return false;

  const slots = state.mode === "build"
    ? ["cpu", "gpu", "ram", "motherboard", "storage", "psu"]
    : ["cpu", "gpu", "ram"];
  const criteria = state.criteria;
  if (criteria.budget !== undefined && (typeof criteria.budget !== "number" || !Number.isFinite(criteria.budget) || criteria.budget <= 0 || criteria.budget > 1_000_000)) return false;
  if (criteria.currency !== undefined && criteria.currency !== "USD" && criteria.currency !== "EUR") return false;
  if (criteria.useCase !== undefined && !["gaming", "productivity", "creation", "balanced"].includes(criteria.useCase)) return false;
  if (criteria.priority !== undefined && !["value", "performance", "balanced"].includes(criteria.priority)) return false;
  if (criteria.resolution !== undefined && !["1080p", "1440p", "4k"].includes(criteria.resolution)) return false;
  if (criteria.fpsTarget !== undefined && (typeof criteria.fpsTarget !== "number" || !Number.isFinite(criteria.fpsTarget) || criteria.fpsTarget <= 0 || criteria.fpsTarget > 1_000)) return false;
  if (criteria.preferences !== undefined && (typeof criteria.preferences !== "string" || criteria.preferences.length > 500)) return false;
  if (criteria.workloads !== undefined && (!Array.isArray(criteria.workloads) || criteria.workloads.length > 12 || criteria.workloads.some((item) => typeof item !== "string" || item.length > 100))) return false;

  if (state.constraints.market !== undefined && !["new", "used"].includes(state.constraints.market)) return false;
  if (state.constraints.preferredBrands !== undefined && (!Array.isArray(state.constraints.preferredBrands) || state.constraints.preferredBrands.length > 12 || state.constraints.preferredBrands.some((item) => typeof item !== "string" || item.length > 60))) return false;
  if (state.constraints.excludedComponents !== undefined && (!Array.isArray(state.constraints.excludedComponents) || state.constraints.excludedComponents.length > 12 || state.constraints.excludedComponents.some((item) => typeof item !== "string" || item.length > 120))) return false;

  return Object.entries(state.constraints.components).every(([slot, constraint]) => {
    if (!slots.includes(slot) || !constraint || typeof constraint !== "object") return false;
    const item = constraint as RecommendationComponentConstraint;
    return typeof item.query === "string" && item.query.length > 0 && item.query.length <= 120
      && ["required", "preferred", "owned", "excluded"].includes(item.role)
      && (item.currency === undefined || item.currency === "USD" || item.currency === "EUR")
      && (item.customPrice === undefined || (typeof item.customPrice === "number" && Number.isFinite(item.customPrice) && item.customPrice > 0 && item.customPrice <= 1_000_000));
  });
}

function isFrontendPriceContext(value: unknown): value is AiFrontendPriceContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const context = value as AiFrontendPriceContext;
  const allowedScopes: AiPriceScope[] = ["catalog", "comparison", "build", "combo", "draft_build", "draft_combo"];
  return allowedScopes.includes(context.scope)
    && (context.currency === "USD" || context.currency === "EUR")
    && Array.isArray(context.items)
    && context.items.length > 0
    && context.items.length <= 6
    && context.items.every((item) => (
      item
      && typeof item.productId === "string"
      && item.productId.length > 0
      && item.productId.length <= 120
      && typeof item.price === "number"
      && Number.isFinite(item.price)
      && item.price > 0
      && item.price <= 1_000_000
      && typeof item.isCustom === "boolean"
      && (item.slot === undefined || (typeof item.slot === "string" && item.slot.length <= 30))
    ));
}

function isCatalogPriceEvaluationRequest(value: unknown): value is CatalogPriceEvaluationRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const evaluation = value as CatalogPriceEvaluationRequest;
  return typeof evaluation.productId === "string"
    && evaluation.productId.length > 0 && evaluation.productId.length <= 120
    && typeof evaluation.price === "number" && Number.isFinite(evaluation.price)
    && evaluation.price > 0 && evaluation.price <= 1_000_000
    && (evaluation.currency === "USD" || evaluation.currency === "EUR")
    && (evaluation.valueProfile === undefined || ["balanced", "gaming", "creation", "productivity"].includes(evaluation.valueProfile))
    && (evaluation.qualityPriceScore === undefined || (typeof evaluation.qualityPriceScore === "number" && Number.isFinite(evaluation.qualityPriceScore)))
    && (evaluation.source === undefined || ["base", "manual", "market", "chat"].includes(evaluation.source));
}

function isPageContext(value: unknown): value is PageContext {
  if (!value || typeof value !== "object") return false;
  const context = value as PageContext;
  return typeof context.pathname === "string"
    && context.pathname.length <= 300
    && (context.search === undefined || (typeof context.search === "string" && context.search.length <= 500))
    && (context.title === undefined || (typeof context.title === "string" && context.title.length <= 200))
    && (context.route === undefined || ["home", "catalog", "comparator", "combo", "build", "vault", "other"].includes(context.route))
    && (context.identifier === undefined || (typeof context.identifier === "string" && context.identifier.length <= 120))
    && (context.entityType === undefined || ["product", "combo", "build", "saved_combo", "saved_build"].includes(context.entityType))
    && (context.entityId === undefined || (typeof context.entityId === "string" && context.entityId.length <= 120))
    && (context.entitySlug === undefined || (typeof context.entitySlug === "string" && context.entitySlug.length <= 120))
    && (context.entityTitle === undefined || (typeof context.entityTitle === "string" && context.entityTitle.length <= 200))
    && (context.entitySummary === undefined || (typeof context.entitySummary === "string" && context.entitySummary.length <= 500))
    && (context.comparison === undefined || isComparisonContext(context.comparison));
}

function isComparisonContext(value: unknown): value is ComparisonContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const comparison = value as ComparisonContext;
  return Array.isArray(comparison.itemIds)
    && comparison.itemIds.length <= 3
    && comparison.itemIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 120)
    && (comparison.componentType === undefined || (typeof comparison.componentType === "string" && comparison.componentType.length <= 30));
}

function isBuildDraft(value: unknown): value is BuildDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const draft = value as BuildDraft;
  if ((draft.title !== undefined && (typeof draft.title !== "string" || draft.title.length > 80))
    || (draft.awaitingTitle !== undefined && typeof draft.awaitingTitle !== "boolean")
    || (draft.awaitingSaveConfirmation !== undefined && typeof draft.awaitingSaveConfirmation !== "boolean")
    || (draft.saveState !== undefined && !["ready", "awaiting_title", "awaiting_save_confirmation"].includes(draft.saveState))
    || (draft.category !== undefined && (typeof draft.category !== "string" || draft.category.length > 60))
     || !["USD", "EUR"].includes(draft.currency)
     || !draft.components || typeof draft.components !== "object" || Array.isArray(draft.components)) return false;
  if (getDraftSaveState(draft) === "awaiting_save_confirmation" && (!draft.title || draft.awaitingTitle === true)) return false;

  const slots: BuildSlot[] = ["cpu", "gpu", "ram", "motherboard", "storage", "psu"];
  return slots.every((slot) => {
    const component = draft.components[slot];
    return component
      && typeof component.id === "string" && component.id.length <= 120
      && typeof component.name === "string" && component.name.length <= 200
      && component.type === slot
      && typeof component.query === "string" && component.query.length <= 120
      && ["custom", "catalog", "msrp"].includes(component.priceMode)
      && (component.owned === undefined || typeof component.owned === "boolean")
      && (component.customPrice === undefined || (typeof component.customPrice === "number" && Number.isFinite(component.customPrice) && component.customPrice > 0 && component.customPrice <= 1_000_000));
  });
}

function isComboDraft(value: unknown): value is ComboDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const draft = value as ComboDraft;
  if ((draft.title !== undefined && (typeof draft.title !== "string" || draft.title.length > 80))
    || (draft.awaitingTitle !== undefined && typeof draft.awaitingTitle !== "boolean")
    || (draft.awaitingSaveConfirmation !== undefined && typeof draft.awaitingSaveConfirmation !== "boolean")
    || (draft.saveState !== undefined && !["ready", "awaiting_title", "awaiting_save_confirmation"].includes(draft.saveState))
    || (draft.category !== undefined && (typeof draft.category !== "string" || draft.category.length > 60))
     || !["USD", "EUR"].includes(draft.currency)
     || !draft.components || typeof draft.components !== "object" || Array.isArray(draft.components)) return false;
  if (getDraftSaveState(draft) === "awaiting_save_confirmation" && (!draft.title || draft.awaitingTitle === true)) return false;

  const slots: ComboSlot[] = ["cpu", "gpu", "ram"];
  return slots.every((slot) => {
    const component = draft.components[slot];
    return component
      && typeof component.id === "string" && component.id.length <= 120
      && typeof component.name === "string" && component.name.length <= 200
      && component.type === slot
      && typeof component.query === "string" && component.query.length <= 120
      && ["custom", "catalog", "msrp"].includes(component.priceMode)
      && (component.owned === undefined || typeof component.owned === "boolean")
      && (component.customPrice === undefined || (typeof component.customPrice === "number" && Number.isFinite(component.customPrice) && component.customPrice > 0 && component.customPrice <= 1_000_000));
  });
}

export function normalizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-MAX_CHAT_HISTORY_MESSAGES).map((message) => ({
    role: message.role,
    content: message.content.trim(),
  }));
}

export function normalizePageContext(context: PageContext | undefined): PageContext | undefined {
  if (!context) return undefined;

  const allowedSearchKeys = new Set(["currency", "page", "q", "brand", "type", "minPrice", "maxPrice"]);
  const searchParams = new URLSearchParams(context.search ?? "");
  const safeSearch = Array.from(searchParams.entries())
    .filter(([key]) => allowedSearchKeys.has(key))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value.slice(0, 100))}`)
    .join("&");

  return {
    pathname: context.pathname.slice(0, 300),
    search: safeSearch ? `?${safeSearch}` : undefined,
    title: context.title?.slice(0, 200),
    route: context.route,
    identifier: context.identifier?.slice(0, 120),
    entityType: context.entityType,
    entityId: context.entityId?.slice(0, 120),
    entitySlug: context.entitySlug?.slice(0, 120),
    ...(context.comparison && context.comparison.itemIds.length > 0
      ? {
          comparison: {
            itemIds: Array.from(new Set(context.comparison.itemIds.map((id) => id.trim()).filter(Boolean))).slice(0, 3),
            ...(context.comparison.componentType ? { componentType: context.comparison.componentType.slice(0, 30) } : {}),
          },
        }
      : {}),
  };
}
