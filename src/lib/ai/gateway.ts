import type { ChatMessage, ChatResponse } from "./types";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 25_000;

const SYSTEM_PROMPT = [
  "Eres el asistente de CoreXScoring.",
  "Responde de forma útil, clara y concisa en español salvo que el usuario pida otro idioma.",
  "En esta primera versión solo conversas: no puedes consultar el catálogo, comparar datos internos, cambiar precios ni ejecutar acciones.",
  "No inventes datos concretos sobre productos, precios, stock o benchmarks; explica cuándo haría falta consultar la información de la aplicación.",
].join(" ");

type ProviderName = "groq" | "openrouter";

interface ProviderErrorPayload {
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
}

class ProviderError extends Error {
  constructor(
    readonly provider: ProviderName,
    readonly status: number,
    readonly code?: string,
  ) {
    super(`El proveedor ${provider} devolvió el estado ${status}.`);
  }
}

interface CompletionPayload {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  model?: string;
}

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta configurar ${name} en el servidor.`);
  }
  return value;
}

async function createCompletion({
  provider,
  url,
  apiKey,
  model,
  messages,
}: {
  provider: ProviderName;
  url: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
}): Promise<ChatResponse> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (provider === "openrouter") {
    headers["X-Title"] = "CoreXScoring";
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.4,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new ProviderError(provider, 503, "network_error");
  }

  if (!response.ok) {
    let payload: ProviderErrorPayload | undefined;
    try {
      payload = await response.json() as ProviderErrorPayload;
    } catch {
      // The status is enough to make the provider decision.
    }

    throw new ProviderError(
      provider,
      response.status,
      payload?.error?.code ?? payload?.error?.type,
    );
  }

  const payload = await response.json() as CompletionPayload;
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new ProviderError(provider, 502, "empty_completion");
  }

  return {
    message: { role: "assistant", content },
    provider,
    model: payload.model || model,
  };
}

function shouldFallbackToOpenRouter(error: unknown): boolean {
  if (!(error instanceof ProviderError) || error.provider !== "groq") {
    return false;
  }

  return error.status === 429 || error.code === "insufficient_quota";
}

export async function runChat(messages: ChatMessage[]): Promise<ChatResponse> {
  const groqModel = process.env.AI_GROQ_MODEL?.trim() || "openai/gpt-oss-20b";
  const openRouterModel = process.env.AI_OPENROUTER_MODEL?.trim() || "openrouter/free";

  try {
    return await createCompletion({
      provider: "groq",
      url: GROQ_CHAT_URL,
      apiKey: getRequiredEnvironmentVariable("GROQ_API_KEY"),
      model: groqModel,
      messages,
    });
  } catch (error) {
    if (!shouldFallbackToOpenRouter(error)) {
      throw error;
    }

    return createCompletion({
      provider: "openrouter",
      url: OPENROUTER_CHAT_URL,
      apiKey: getRequiredEnvironmentVariable("OPENROUTER_API_KEY"),
      model: openRouterModel,
      messages,
    });
  }
}
