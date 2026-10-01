import { MAX_ASSISTANT_MESSAGE_LENGTH, type ChatMessage } from "./types";

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
  if (!continuation) return [...messages, userMessage, assistantMessage];

  const previousAssistantIndex = [...messages].map((message) => message.role).lastIndexOf("assistant");
  if (previousAssistantIndex < 0) return [...messages, assistantMessage];

  const previous = messages[previousAssistantIndex];
  const next = [...messages];
  next[previousAssistantIndex] = {
    role: "assistant",
    content: joinAssistantContinuation(previous.content, assistantMessage.content),
  };
  return next;
}

export function joinAssistantContinuation(previous: string, continuation: string): string {
  const left = previous.trimEnd();
  const right = continuation.trimStart();
  if (!left) return right;
  if (!right) return left;

  const maxOverlap = Math.min(left.length, right.length, 500);
  for (let overlap = maxOverlap; overlap >= 8; overlap -= 1) {
    if (left.slice(-overlap).toLowerCase() === right.slice(0, overlap).toLowerCase()) {
      return `${left}${right.slice(overlap)}`.slice(0, MAX_ASSISTANT_MESSAGE_LENGTH);
    }
  }
  return `${left}\n${right}`.slice(0, MAX_ASSISTANT_MESSAGE_LENGTH);
}
