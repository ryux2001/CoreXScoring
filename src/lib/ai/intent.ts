import type { ChatMessage } from "./types";

export function normalizeIntentText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[¿¡\s]+/, "")
    .trim();
}

export function isBuildRecommendationRequest(value: string): boolean {
  const text = normalizeIntentText(value);
  const hasRecommendationVerb = /\b(?:recomiend|recomend|hazme|creame|crea|prepara|generame|genera|arma|armame|monta|montame|quiero|necesito|recommend|make|create|prepare|assemble)\w*\b/.test(text)
    || /\bbuild\s+(?:me|a|an|the)\b/.test(text);
  const hasBuildReference = /\b(?:build|pc|ordenador|computadora|equipo|configuracion|setup|computer|gaming\s+pc)\b/.test(text);
  return hasRecommendationVerb && hasBuildReference;
}

export function isComboRecommendationRequest(value: string): boolean {
  const text = normalizeIntentText(value);
  const hasRecommendationVerb = /\b(?:recomiend|recomend|hazme|creame|crea|prepara|generame|genera|arma|armame|monta|montame|quiero|necesito|recommend|make|create|prepare|assemble)\w*\b/.test(text);
  const hasComboReference = /\b(?:combo|combinacion|combination|pack)\b/.test(text);
  return hasRecommendationVerb && hasComboReference;
}

function asksForBuildCriteria(value: string): boolean {
  return /\b(?:presupuesto|resolucion|uso\s+principal|preferencia|prioridad|budget|resolution|use\s+case|preference|priority)\b/.test(normalizeIntentText(value));
}

function hasBuildCriteriaAnswer(value: string): boolean {
  const text = normalizeIntentText(value);
  return /\b(?:\d{2,5}(?:[.,]\d{1,2})?|1080p|1440p|4k|gaming|aaa|productividad|creacion|ningun[ao]|sin\s+preferencia|calidad\s*\/\s*precio|maximo\s+rendimiento|balanced|value|performance)\b/.test(text);
}

function asksForComboCriteria(value: string): boolean {
  return /\b(?:presupuesto|resolucion|uso\s+principal|preferencia|prioridad|mercado|moneda|budget|resolution|use\s+case|preference|priority|market|currency)\b/.test(normalizeIntentText(value));
}

function hasComboCriteriaAnswer(value: string): boolean {
  const text = normalizeIntentText(value);
  return /\b(?:\d{2,5}(?:[.,]\d{1,2})?|1080p|1440p|4k|gaming|aaa|productividad|creacion|nuevo|nueva|usado|usada|usd|eur|dolares?|euros?|ningun[ao]|sin\s+preferencia|calidad\s*\/\s*precio|maximo\s+rendimiento|balanced|value|performance)\b/.test(text);
}

function findLatestRecommendationRequestIndex(
  messages: ChatMessage[],
  beforeIndex: number,
  predicate: (value: string) => boolean,
): number {
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "user" && predicate(message.content)) return index;
  }
  return -1;
}

export function isCompleteBuildRecommendationRequest(value: string): boolean {
  const text = normalizeIntentText(value);
  const hasBudget = /\b\d{2,5}(?:[.,]\d{1,2})?\b/.test(text);
  return isBuildRecommendationRequest(value) && hasBudget;
}

export function isCompleteComboRecommendationRequest(value: string): boolean {
  const text = normalizeIntentText(value);
  const hasBudget = /\b\d{2,5}(?:[.,]\d{1,2})?\b/.test(text);
  return isComboRecommendationRequest(value) && hasBudget;
}

/** Detecta respuestas que completan una recomendacion de build iniciada antes. */
export function isBuildRecommendationFollowUp(messages: ChatMessage[]): boolean {
  const latestUserIndex = [...messages].map((message) => message.role).lastIndexOf("user");
  if (latestUserIndex < 0) return false;
  const latestUserMessage = messages[latestUserIndex];
  const requestIndex = findLatestRecommendationRequestIndex(messages, latestUserIndex, isBuildRecommendationRequest);
  if (requestIndex < 0) return false;

  const assistantAskedForCriteria = messages.slice(requestIndex + 1, latestUserIndex).some((message) => (
    message.role === "assistant" && asksForBuildCriteria(message.content)
  ));
  return assistantAskedForCriteria && hasBuildCriteriaAnswer(latestUserMessage.content);
}

/** Detecta respuestas que completan una recomendacion de combo iniciada antes. */
export function isComboRecommendationFollowUp(messages: ChatMessage[]): boolean {
  const latestUserIndex = [...messages].map((message) => message.role).lastIndexOf("user");
  if (latestUserIndex < 0) return false;
  const latestUserMessage = messages[latestUserIndex];
  const requestIndex = findLatestRecommendationRequestIndex(messages, latestUserIndex, isComboRecommendationRequest);
  if (requestIndex < 0) return false;

  const assistantAskedForCriteria = messages.slice(requestIndex + 1, latestUserIndex).some((message) => (
    message.role === "assistant" && asksForComboCriteria(message.content)
  ));
  return assistantAskedForCriteria && hasComboCriteriaAnswer(latestUserMessage.content);
}

export function hasActiveBuildRecommendation(messages: ChatMessage[]): boolean {
  return isBuildRecommendationFollowUp(messages) || messages.some((message) => (
    message.role === "user" && isBuildRecommendationRequest(message.content)
  ));
}

export function hasActiveComboRecommendation(messages: ChatMessage[]): boolean {
  return isComboRecommendationFollowUp(messages) || messages.some((message) => (
    message.role === "user" && isComboRecommendationRequest(message.content)
  ));
}
