import { decryptProviderApiKey } from "../provider-keys";
import type { AiSupabaseClient } from "../tools/types";

export type WebSearchProvider = "tavily" | "brave";

export interface WebSearchProviderSettings {
  preferredProvider: WebSearchProvider;
  tavilyApiKey?: string;
  braveApiKey?: string;
  tavilyConfigured: boolean;
  braveConfigured: boolean;
  tavilyHint?: string;
  braveHint?: string;
}

function asProvider(value: unknown): WebSearchProvider {
  return value === "brave" ? "brave" : "tavily";
}

/** Lee las claves cifradas del usuario; nunca devuelve ciphertext al resto de la app. */
export async function getWebSearchProviderSettings(
  supabase: AiSupabaseClient,
  userId: string,
): Promise<WebSearchProviderSettings> {
  const fallbackProvider = asProvider(process.env.WEB_SEARCH_PROVIDER?.trim().toLowerCase());
  const fallback: WebSearchProviderSettings = {
    preferredProvider: fallbackProvider,
    tavilyApiKey: process.env.TAVILY_API_KEY?.trim() || undefined,
    braveApiKey: process.env.BRAVE_SEARCH_API_KEY?.trim() || undefined,
    tavilyConfigured: Boolean(process.env.TAVILY_API_KEY?.trim()),
    braveConfigured: Boolean(process.env.BRAVE_SEARCH_API_KEY?.trim()),
  };

  const { data, error } = await supabase
    .from("user_ai_web_search_settings")
    .select("preferred_provider,tavily_api_key_ciphertext,tavily_key_hint,brave_api_key_ciphertext,brave_key_hint")
    .eq("user_id", userId)
    .maybeSingle();
  // Permite que el entorno siga funcionando mientras la migración aún no se aplica.
  if (error || !data) return fallback;

  const row = data as Record<string, unknown>;
  const tavilyApiKey = decryptProviderApiKey(row.tavily_api_key_ciphertext) || fallback.tavilyApiKey;
  const braveApiKey = decryptProviderApiKey(row.brave_api_key_ciphertext) || fallback.braveApiKey;
  return {
    preferredProvider: asProvider(row.preferred_provider),
    tavilyApiKey,
    braveApiKey,
    tavilyConfigured: Boolean(tavilyApiKey),
    braveConfigured: Boolean(braveApiKey),
    tavilyHint: typeof row.tavily_key_hint === "string" ? row.tavily_key_hint : undefined,
    braveHint: typeof row.brave_key_hint === "string" ? row.brave_key_hint : undefined,
  };
}
