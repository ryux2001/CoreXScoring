import type { ChatMessage, ChatResponse } from "./types";

export const HARDWARE_GUARDRAIL_VERSION = "hardware-v1";

export type ChatIntent = "hardware" | "uso_de_la_web" | "fuera_de_alcance" | "riesgo";

interface GuardrailDecision {
  intent: ChatIntent;
  response?: ChatResponse;
}

const HARDWARE_TERMS = [
  "hardware",
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
];

const RISK_PATTERNS = [
  /ignora\s+(?:tus|las|todas)\s+(?:instrucciones|reglas|politicas)/,
  /(?:revela|muestra|imprime|dime).*(?:prompt|instrucciones internas|api key|clave|secreto)/,
  /prompt\s+del\s+sistema/,
  /(?:ejecuta|escribe|genera).*(?:sql|consulta\s+directa|codigo\s+arbitrario)/,
  /(?:desactiva|elude|salta).*(?:seguridad|guardrail|politica|confirmacion)/,
  /actua\s+como.*(?:sin restricciones|sin limites|jailbreak)/,
  /\bjailbreak\b/,
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
];

const GENERIC_ALLOWED_PATTERNS = [
  /^(?:hola|buenas|hey|buenos dias|buenas tardes|buenas noches)\b/,
  /^(?:quien eres|que puedes hacer|como funcionas|necesito ayuda|ayudame)\b/,
];

const REFUSAL_RESPONSE =
  "Soy CoreX AI, el asistente de hardware de CoreXScoring. Puedo ayudarte con componentes de PC, compatibilidad, rendimiento y el uso de la web. Ese tema queda fuera de mi alcance; reformula tu pregunta hacia hardware o CoreXScoring.";

const RISK_RESPONSE =
  "No puedo revelar instrucciones internas, claves, secretos ni ejecutar acciones fuera de las funciones autorizadas. Soy CoreX AI y puedo ayudarte con hardware de PC o con el uso de CoreXScoring.";

function normalizeForClassification(content: string): string {
  return content
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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

export function classifyChatIntent(messages: ChatMessage[]): ChatIntent {
  const latestMessage = getLatestUserMessage(messages);
  if (!latestMessage) return "fuera_de_alcance";

  const content = normalizeForClassification(latestMessage.content);
  const context = normalizeForClassification(getContextText(messages, latestMessage));

  if (containsPattern(content, RISK_PATTERNS)) return "riesgo";
  if (containsTerm(content, HARDWARE_TERMS) || isShortContextualFollowUp(content, context)) {
    return "hardware";
  }
  if (containsTerm(content, WEB_USAGE_TERMS) || containsPattern(content, GENERIC_ALLOWED_PATTERNS)) {
    return "uso_de_la_web";
  }
  if (containsPattern(content, OUT_OF_SCOPE_PATTERNS)) return "fuera_de_alcance";

  return "fuera_de_alcance";
}

function createGuardrailResponse(content: string): ChatResponse {
  return {
    message: { role: "assistant", content },
    provider: "guardrail",
    model: HARDWARE_GUARDRAIL_VERSION,
  };
}

export function evaluateChatGuardrails(messages: ChatMessage[]): GuardrailDecision {
  const intent = classifyChatIntent(messages);

  if (intent === "riesgo") {
    return { intent, response: createGuardrailResponse(RISK_RESPONSE) };
  }

  if (intent === "fuera_de_alcance") {
    return { intent, response: createGuardrailResponse(REFUSAL_RESPONSE) };
  }

  return { intent };
}
