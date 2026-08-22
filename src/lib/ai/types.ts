export const MAX_CHAT_MESSAGE_LENGTH = 2_000;
export const MAX_CHAT_HISTORY_MESSAGES = 12;

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  message: ChatMessage;
  provider: "groq" | "openrouter";
  model: string;
}

export function isChatRequest(value: unknown): value is ChatRequest {
  if (!value || typeof value !== "object" || !Array.isArray((value as ChatRequest).messages)) {
    return false;
  }

  const { messages } = value as ChatRequest;
  if (messages.length === 0 || messages.length > MAX_CHAT_HISTORY_MESSAGES) {
    return false;
  }

  return messages.every((message) => (
    message
    && (message.role === "user" || message.role === "assistant")
    && typeof message.content === "string"
    && message.content.trim().length > 0
    && message.content.length <= MAX_CHAT_MESSAGE_LENGTH
  ));
}

export function normalizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-MAX_CHAT_HISTORY_MESSAGES).map((message) => ({
    role: message.role,
    content: message.content.trim(),
  }));
}
