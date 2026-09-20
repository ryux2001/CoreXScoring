import type { ChatMessage, ChatResponse } from "./types";
import type { AiToolContext } from "./tools/types";
import { detectResponseLanguage } from "./language";

type VaultCollection = "combos" | "builds";

const OWNED_LOOKUP_TERMS = /\b(?:tengo|tienes|cuantos|cuantas|cuanto|cuanta|lista|listar|ver|muestra|mostrar|ensena|guardad|cread|boveda|my|mine|how many|list|show|saved|created|vault)\b/;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_[\]<>]/g, "\\$&");
}

function getLatestUserMessage(messages: ChatMessage[]): string {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
}

function detectOwnedLookup(messages: ChatMessage[]): VaultCollection | null {
  const message = normalize(getLatestUserMessage(messages));
  if (!OWNED_LOOKUP_TERMS.test(message)) return null;
  if (/\bcombos?\b/.test(message)) return "combos";
  if (/\bbuilds?\b/.test(message)) return "builds";
  return null;
}

function directResponse(content: string): ChatResponse {
  return {
    message: { role: "assistant", content },
    provider: "guardrail",
    model: "vault-direct-v1",
    toolCalls: 1,
  };
}

/**
 * Resuelve consultas inequívocas sobre la bóveda sin dejar que el modelo omita la tool.
 * Solo intercepta peticiones de listado/consulta propias; recomendaciones y acciones
 * continúan a través del gateway normal.
 */
export async function resolveDirectVaultLookup(
  messages: ChatMessage[],
  context: AiToolContext,
): Promise<ChatResponse | null> {
  const collection = detectOwnedLookup(messages);
  if (!collection) return null;

  const language = detectResponseLanguage(messages);

  if (context.actor.isAnonymous) {
    return directResponse(language === "es"
      ? "Para consultar tu bóveda necesitas iniciar sesión con una cuenta registrada."
      : "To view your vault, you need to sign in with a registered account.");
  }

  const table = collection === "combos" ? "created_combos" : "created_builds";
  const { data, error } = await context.supabase
    .from(table)
    .select("title,slug,created_at")
    .eq("user_id", context.actor.id)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    return directResponse(language === "es"
      ? `No pude consultar tus ${collection} en este momento. Inténtalo de nuevo.`
      : `I could not load your ${collection} right now. Please try again.`);
  }

  const items = Array.isArray(data) ? data : [];
  const label = collection === "combos"
    ? language === "es" ? "combos" : "combos"
    : language === "es" ? "builds" : "builds";
  if (items.length === 0) {
    return directResponse(language === "es"
      ? `No tienes ${label} creados todavía en tu bóveda.`
      : `You do not have any ${label} in your vault yet.`);
  }

  const basePath = collection === "combos" ? "/vault/combos-created" : "/vault/builds-created";
  const lines = items.map((item) => {
    const title = escapeMarkdown(typeof item.title === "string" ? item.title : "Sin nombre");
    const slug = typeof item.slug === "string" ? encodeURIComponent(item.slug) : "";
    return slug ? `- [${title}](${basePath}/${slug})` : `- ${title}`;
  });
  const suffix = items.length === 6
    ? language === "es" ? " Te muestro los 6 más recientes." : " Showing the 6 most recent ones."
    : "";

  return directResponse(language === "es"
    ? `Sí, tienes ${items.length} ${label} creado${items.length === 1 ? "" : "s"} en tu bóveda.${suffix}\n\n${lines.join("\n")}`
    : `You have ${items.length} ${label} in your vault.${suffix}\n\n${lines.join("\n")}`);
}
