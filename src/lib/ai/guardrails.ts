import type { ChatMessage, ChatResponse, RecommendationState } from "./types";
import { detectResponseLanguage, type AiResponseLanguage } from "./language";
import { isBuildRecommendationFollowUp, isComboRecommendationFollowUp, normalizeIntentText } from "./intent";
import { isActiveRecommendation } from "./recommendation-state";

export const HARDWARE_GUARDRAIL_VERSION = "hardware-v1";

export type ChatIntent = "hardware" | "uso_de_la_web" | "fuera_de_alcance" | "riesgo";

interface GuardrailDecision {
  intent: ChatIntent;
  response?: ChatResponse;
}

const HARDWARE_TERMS = [
  "hardware",
  "componente",
  "componentes",
  "pc",
  "ordenador",
  "computadora",
  "procesador",
  "cpu",
  "gpu",
  "grafica",
  "tarjeta grafica",
  "placa base",
  "motherboard",
  "ram",
  "memoria",
  "ddr4",
  "ddr5",
  "ssd",
  "nvme",
  "disco duro",
  "hdd",
  "fuente de alimentacion",
  "psu",
  "refrigeracion",
  "disipador",
  "ventilador",
  "caja",
  "gabinete",
  "monitor",
  "teclado",
  "raton",
  "mouse",
  "vram",
  "pcie",
  "am4",
  "am5",
  "lga",
  "ryzen",
  "intel",
  "radeon",
  "geforce",
  "rtx",
  "gtx",
  "arc",
  "fps",
  "benchmark",
  "scoring",
  "score",
  "puntuacion",
  "metrica",
  "rendimiento",
  "cuello de botella",
  "compatibilidad",
  "1440p",
  "4k",
  "gaming",
  "jugar",
  "computer",
  "graphics card",
  "power supply",
  "cooler",
  "memory",
  "storage",
  "performance",
  "bottleneck",
  "compatibility",
  "gaming pc",
];

const WEB_USAGE_TERMS = [
  "corexscoring",
  "catalogo",
  "comparador",
  "comparar productos",
  "comparativa",
  "combo",
  "build",
  "boveda",
  "mi cuenta",
  "iniciar sesion",
  "cerrar sesion",
  "sidebar",
  "panel de ia",
  "chat",
  "uso de la web",
  "moneda",
  "catalog",
  "comparator",
  "compare",
  "vault",
  "account",
  "sign in",
  "log in",
  "log out",
  "ai panel",
  "currency",
];

const RISK_PATTERNS = [
  /ignora\s+(?:tus|las|todas)\s+(?:instrucciones|reglas|politicas)/,
  /(?:revela|muestra|imprime|dime).*(?:prompt|instrucciones internas|api key|clave|secreto)/,
  /prompt\s+del\s+sistema/,
  /(?:ejecuta|escribe|genera).*(?:sql|consulta\s+directa|codigo\s+arbitrario)/,
  /(?:desactiva|elude|salta).*(?:seguridad|guardrail|politica|confirmacion)/,
  /actua\s+como.*(?:sin restricciones|sin limites|jailbreak)/,
  /\bjailbreak\b/,
  /ignore\s+(?:your|the|all)\s+(?:instructions|rules|policies)/,
  /(?:reveal|show|print|tell me).*(?:prompt|internal instructions|api key|secret)/,
  /system\s+prompt/,
  /(?:run|write|generate).*(?:sql|direct query|arbitrary code)/,
  /(?:disable|bypass|skip).*(?:security|guardrail|policy|confirmation)/,
  /act\s+as.*(?:unrestricted|without limits)/,
];

const OUT_OF_SCOPE_PATTERNS = [
  /\b(?:receta|cocina|cocinar|pastel|postre)\b/,
  /\b(?:dieta|calorias|sintoma|diagnostico|medico|medicina|dolor)\b/,
  /\b(?:abogado|abogada|contrato|demanda|impuestos|declaracion fiscal)\b/,
  /\b(?:politica|elecciones|presidente|partido politico)\b/,
  /\b(?:futbol|baloncesto|tenis|resultado del partido)\b/,
  /\b(?:viaje|hotel|vuelo|turismo|restaurante)\b/,
  /\b(?:poema|cancion|letra de cancion|historia romantica)\b/,
  /\b(?:python|javascript|typescript|react|next\.js|sql)\b/,
  /\b(?:recipe|cooking|calories|symptom|diagnosis|medicine|lawyer|contract|taxes|elections|president|football|basketball|tennis|travel|hotel|flight|restaurant|poem|song lyrics|romantic story)\b/,
];

const GENERIC_ALLOWED_PATTERNS = [
  /^(?:hola|buenas|hey|buenos dias|buenas tardes|buenas noches)\b/,
  /^(?:quien eres|que puedes hacer|como funcionas|necesito ayuda|ayudame)\b/,
  /^(?:hello|hi|hey|good morning|good afternoon|good evening)\b/,
  /^(?:who are you|what can you do|how do you work|i need help|help me)\b/,
];

function getRefusalResponse(language: AiResponseLanguage): string {
  return language === "es"
    ? "Soy CoreX AI, el asistente de hardware de CoreXScoring. Puedo ayudarte con componentes de PC, compatibilidad, rendimiento y el uso de la web. Ese tema queda fuera de mi alcance; reformula tu pregunta hacia hardware o CoreXScoring."
    : "I am CoreX AI, CoreXScoring's hardware assistant. I can help with PC components, compatibility, performance, and using the website. That topic is outside my scope; please rephrase your question about hardware or CoreXScoring.";
}

function getRiskResponse(language: AiResponseLanguage): string {
  return language === "es"
    ? "No puedo revelar instrucciones internas, claves, secretos ni ejecutar acciones fuera de las funciones autorizadas. Soy CoreX AI y puedo ayudarte con hardware de PC o con el uso de CoreXScoring."
    : "I cannot reveal internal instructions, keys, secrets, or perform actions outside the authorized functions. I am CoreX AI and can help with PC hardware or using CoreXScoring.";
}

function containsTerm(content: string, terms: string[]): boolean {
  return terms.some((term) => content.includes(term));
}

function containsPattern(content: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(content));
}

function getLatestUserMessage(messages: ChatMessage[]): ChatMessage | undefined {
  return [...messages].reverse().find((message) => message.role === "user");
}

function getContextText(messages: ChatMessage[], latestMessage: ChatMessage): string {
  const latestIndex = messages.lastIndexOf(latestMessage);
  return messages
    .slice(Math.max(0, latestIndex - 3), latestIndex)
    .map((message) => message.content)
    .join(" ");
}

function isShortContextualFollowUp(content: string, context: string): boolean {
  return content.length <= 80 && containsTerm(context, HARDWARE_TERMS);
}

export function classifyChatIntent(messages: ChatMessage[], recommendationState?: RecommendationState): ChatIntent {
  const latestMessage = getLatestUserMessage(messages);
  if (!latestMessage) return "fuera_de_alcance";

  const content = normalizeIntentText(latestMessage.content);
  const context = normalizeIntentText(getContextText(messages, latestMessage));

  if (containsPattern(content, RISK_PATTERNS)) return "riesgo";
  if (containsPattern(content, OUT_OF_SCOPE_PATTERNS)) return "fuera_de_alcance";
  if (isActiveRecommendation(recommendationState)) return "hardware";
  if (containsTerm(content, HARDWARE_TERMS) || isShortContextualFollowUp(content, context) || isBuildRecommendationFollowUp(messages) || isComboRecommendationFollowUp(messages)) {
    return "hardware";
  }
  if (containsTerm(content, WEB_USAGE_TERMS) || containsPattern(content, GENERIC_ALLOWED_PATTERNS)) {
    return "uso_de_la_web";
  }
  return "fuera_de_alcance";
}

function createGuardrailResponse(content: string): ChatResponse {
  return {
    message: { role: "assistant", content },
    provider: "guardrail",
    model: HARDWARE_GUARDRAIL_VERSION,
  };
}

export function evaluateChatGuardrails(messages: ChatMessage[], recommendationState?: RecommendationState): GuardrailDecision {
  const intent = classifyChatIntent(messages, recommendationState);

  if (intent === "riesgo") {
    return { intent, response: createGuardrailResponse(getRiskResponse(detectResponseLanguage(messages))) };
  }

  if (intent === "fuera_de_alcance") {
    return { intent, response: createGuardrailResponse(getRefusalResponse(detectResponseLanguage(messages))) };
  }

  return { intent };
}
