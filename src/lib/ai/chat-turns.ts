import type { ChatMessage } from "./types";

export function getChatRequestMessages(
  messages: ChatMessage[],
  userMessage: ChatMessage,
  continuation = false,
): ChatMessage[] {
  return (continuation ? messages : [...messages, userMessage]).slice(-12);
}

export function completeChatTurn(
  messages: ChatMessage[],
  userMessage: ChatMessage,
  assistantMessage: ChatMessage,
  continuation = false,
): ChatMessage[] {
  return continuation ? [...messages, assistantMessage] : [...messages, userMessage, assistantMessage];
}
