export const MAX_CHAT_MESSAGE_LENGTH = 2_000;
export const MAX_CHAT_HISTORY_MESSAGES = 12;

export type ChatRole = "user" | "assistant";
export type ChatProvider = "groq" | "openrouter" | "guardrail";

export type PageRoute = "home" | "catalog" | "comparator" | "combo" | "build" | "vault" | "other";

export interface PageContext {
  pathname: string;
  search?: string;
  title?: string;
  route?: PageRoute;
  identifier?: string;
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatRequest {
  messages: ChatMessage[];
  context?: PageContext;
}

export interface ChatResponse {
  message: ChatMessage;
  provider: ChatProvider;
  model: string;
  usage?: ChatUsage;
  toolCalls?: number;
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
    && (context.identifier === undefined || (typeof context.identifier === "string" && context.identifier.length <= 120));
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
  };
}
