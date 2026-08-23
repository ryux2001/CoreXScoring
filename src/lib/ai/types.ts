export const MAX_CHAT_MESSAGE_LENGTH = 2_000;
export const MAX_CHAT_HISTORY_MESSAGES = 12;

export type ChatRole = "user" | "assistant";
export type ChatProvider = "local" | "groq" | "cerebras" | "openrouter" | "guardrail";

export type PageRoute = "home" | "catalog" | "comparator" | "combo" | "build" | "vault" | "other";
export type PageEntityType = "product" | "combo" | "build" | "saved_combo" | "saved_build";
export type BuildSlot = "cpu" | "gpu" | "ram" | "motherboard" | "storage" | "psu";
export type ComboSlot = "cpu" | "gpu" | "ram";

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
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
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
}

export interface BuildDraft {
  title?: string;
  awaitingTitle?: boolean;
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
}

export interface ComboDraft {
  title?: string;
  awaitingTitle?: boolean;
  category?: string;
  currency: "USD" | "EUR";
  components: Record<ComboSlot, ComboDraftComponent>;
}

export interface AiActionRequest {
  id: string;
  digest: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  context?: PageContext;
  buildDraft?: BuildDraft;
  comboDraft?: ComboDraft;
  action?: AiActionRequest;
}

export interface ChatResponse {
  message: ChatMessage;
  provider: ChatProvider;
  model: string;
  usage?: ChatUsage;
  toolCalls?: number;
  pendingAction?: PendingAction;
  buildDraft?: BuildDraft;
  comboDraft?: ComboDraft;
  webSearch?: import("./web-search/types").ExternalPriceSearchResult;
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

  const buildDraft = (value as ChatRequest).buildDraft;
  if (buildDraft !== undefined && !isBuildDraft(buildDraft)) return false;
  const comboDraft = (value as ChatRequest).comboDraft;
  if (comboDraft !== undefined && !isComboDraft(comboDraft)) return false;

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
    && (context.entitySummary === undefined || (typeof context.entitySummary === "string" && context.entitySummary.length <= 500));
}

function isBuildDraft(value: unknown): value is BuildDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const draft = value as BuildDraft;
  if ((draft.title !== undefined && (typeof draft.title !== "string" || draft.title.length > 80))
    || (draft.awaitingTitle !== undefined && typeof draft.awaitingTitle !== "boolean")
    || (draft.category !== undefined && (typeof draft.category !== "string" || draft.category.length > 60))
    || !["USD", "EUR"].includes(draft.currency)
    || !draft.components || typeof draft.components !== "object" || Array.isArray(draft.components)) return false;

  const slots: BuildSlot[] = ["cpu", "gpu", "ram", "motherboard", "storage", "psu"];
  return slots.every((slot) => {
    const component = draft.components[slot];
    return component
      && typeof component.id === "string" && component.id.length <= 120
      && typeof component.name === "string" && component.name.length <= 200
      && component.type === slot
      && typeof component.query === "string" && component.query.length <= 120
      && ["custom", "catalog", "msrp"].includes(component.priceMode)
      && (component.customPrice === undefined || (typeof component.customPrice === "number" && Number.isFinite(component.customPrice) && component.customPrice > 0 && component.customPrice <= 1_000_000));
  });
}

function isComboDraft(value: unknown): value is ComboDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const draft = value as ComboDraft;
  if ((draft.title !== undefined && (typeof draft.title !== "string" || draft.title.length > 80))
    || (draft.awaitingTitle !== undefined && typeof draft.awaitingTitle !== "boolean")
    || (draft.category !== undefined && (typeof draft.category !== "string" || draft.category.length > 60))
    || !["USD", "EUR"].includes(draft.currency)
    || !draft.components || typeof draft.components !== "object" || Array.isArray(draft.components)) return false;

  const slots: ComboSlot[] = ["cpu", "gpu", "ram"];
  return slots.every((slot) => {
    const component = draft.components[slot];
    return component
      && typeof component.id === "string" && component.id.length <= 120
      && typeof component.name === "string" && component.name.length <= 200
      && component.type === slot
      && typeof component.query === "string" && component.query.length <= 120
      && ["custom", "catalog", "msrp"].includes(component.priceMode)
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
    entityTitle: context.entityTitle?.slice(0, 200),
    entitySummary: context.entitySummary?.slice(0, 500),
  };
}
