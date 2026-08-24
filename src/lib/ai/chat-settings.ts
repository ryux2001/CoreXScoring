import { decryptProviderApiKey, encryptProviderApiKey } from "./provider-keys";
import type { AiChatProvider, AiCredentialMode } from "./types";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

const DEFAULT_GROQ_MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.6-27b"];
const DEFAULT_OPENROUTER_MODELS = [
  "openai/gpt-oss-20b:free",
  "z-ai/glm-4.5-air:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
];

export interface AiChatSettingsPublic {
  credentialMode: AiCredentialMode;
  preferredProvider: AiChatProvider;
  preferredModel: string;
  models: Record<AiChatProvider, string[]>;
  groq: { configured: boolean; hint: string | null };
  openrouter: { configured: boolean; hint: string | null };
  localOnly: boolean;
}

export interface AiChatCredential {
  provider: AiChatProvider;
  model: string;
  apiKey: string;
}

interface SettingsRow {
  credential_mode?: unknown;
  preferred_provider?: unknown;
  preferred_model?: unknown;
  groq_api_key_ciphertext?: unknown;
  groq_key_hint?: unknown;
  openrouter_api_key_ciphertext?: unknown;
  openrouter_key_hint?: unknown;
}

function configuredModels(variableName: string, defaults: string[]): string[] {
  const configured = process.env[variableName]
    ?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return [...new Set(configured?.length ? configured : defaults)];
}

export function getAllowedAiChatModels(): Record<AiChatProvider, string[]> {
  return {
    groq: configuredModels("AI_BYOK_GROQ_MODELS", configuredModels("AI_GROQ_MODELS", DEFAULT_GROQ_MODELS)),
    openrouter: configuredModels("AI_BYOK_OPENROUTER_MODELS", configuredModels("AI_OPENROUTER_MODELS", DEFAULT_OPENROUTER_MODELS)),
  };
}

function asProvider(value: unknown): AiChatProvider {
  return value === "groq" ? "groq" : "openrouter";
}

function asMode(value: unknown): AiCredentialMode {
  return value === "byok" ? "byok" : "project";
}

function asRow(value: unknown): SettingsRow {
  return value && typeof value === "object" && !Array.isArray(value) ? value as SettingsRow : {};
}

async function readSettings(userId: string): Promise<SettingsRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_ai_chat_settings")
    .select("credential_mode,preferred_provider,preferred_model,groq_api_key_ciphertext,groq_key_hint,openrouter_api_key_ciphertext,openrouter_key_hint")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("No se pudo cargar la configuración de CoreX AI.");
  return data ? asRow(data) : null;
}

export async function getAiChatSettingsPublic(userId: string): Promise<AiChatSettingsPublic> {
  const row = await readSettings(userId);
  const models = getAllowedAiChatModels();
  const preferredProvider = asProvider(row?.preferred_provider);
  const preferredModel = typeof row?.preferred_model === "string" && models[preferredProvider].includes(row.preferred_model)
    ? row.preferred_model
    : models[preferredProvider][0] || "";

  return {
    credentialMode: asMode(row?.credential_mode),
    preferredProvider,
    preferredModel,
    models,
    groq: {
      configured: typeof row?.groq_api_key_ciphertext === "string" && Boolean(row.groq_api_key_ciphertext),
      hint: typeof row?.groq_key_hint === "string" ? row.groq_key_hint : null,
    },
    openrouter: {
      configured: typeof row?.openrouter_api_key_ciphertext === "string" && Boolean(row.openrouter_api_key_ciphertext),
      hint: typeof row?.openrouter_key_hint === "string" ? row.openrouter_key_hint : null,
    },
    localOnly: process.env.AI_LOCAL_ONLY?.trim().toLowerCase() === "true",
  };
}

export async function getAiChatCredential(userId: string): Promise<AiChatCredential | null> {
  if (process.env.AI_LOCAL_ONLY?.trim().toLowerCase() === "true") return null;

  const row = await readSettings(userId);
  if (asMode(row?.credential_mode) !== "byok") return null;

  const models = getAllowedAiChatModels();
  const provider = asProvider(row?.preferred_provider);
  const model = typeof row?.preferred_model === "string" && models[provider].includes(row.preferred_model)
    ? row.preferred_model
    : models[provider][0];
  if (!model) throw new Error("No hay modelos BYOK permitidos para el proveedor seleccionado.");

  const ciphertext = provider === "groq" ? row?.groq_api_key_ciphertext : row?.openrouter_api_key_ciphertext;
  const apiKey = decryptProviderApiKey(ciphertext);
  if (!apiKey) throw new Error("La API key personalizada no está configurada o no se pudo descifrar.");

  return { provider, model, apiKey };
}

export async function saveAiChatSettings({
  userId,
  credentialMode,
  provider,
  model,
  apiKey,
}: {
  userId: string;
  credentialMode: AiCredentialMode;
  provider: AiChatProvider;
  model: string;
  apiKey?: string;
}): Promise<AiChatSettingsPublic> {
  const models = getAllowedAiChatModels();
  if (!models[provider].includes(model)) throw new Error("El modelo seleccionado no está permitido.");
  if (apiKey !== undefined && (apiKey.length < 12 || apiKey.length > 500)) {
    throw new Error("La API key no tiene un formato válido.");
  }

  const current = await readSettings(userId);
  const keyColumn = provider === "groq" ? "groq_api_key_ciphertext" : "openrouter_api_key_ciphertext";
  const hintColumn = provider === "groq" ? "groq_key_hint" : "openrouter_key_hint";
  const update: Record<string, unknown> = {
    user_id: userId,
    credential_mode: credentialMode,
    preferred_provider: provider,
    preferred_model: model,
  };

  if (apiKey !== undefined) {
    update[keyColumn] = apiKey ? encryptProviderApiKey(apiKey) : null;
    update[hintColumn] = apiKey ? `••••${apiKey.slice(-4)}` : null;
  } else if (current?.[keyColumn as keyof SettingsRow]) {
    update[keyColumn] = current[keyColumn as keyof SettingsRow];
    update[hintColumn] = current[hintColumn as keyof SettingsRow] || null;
  }

  const { error } = await createSupabaseAdminClient()
    .from("user_ai_chat_settings")
    .upsert(update, { onConflict: "user_id" });
  if (error) throw new Error("No se pudo guardar la configuración de CoreX AI.");

  return getAiChatSettingsPublic(userId);
}

export async function removeAiChatKey(userId: string, provider: AiChatProvider): Promise<AiChatSettingsPublic> {
  const keyColumn = provider === "groq" ? "groq_api_key_ciphertext" : "openrouter_api_key_ciphertext";
  const hintColumn = provider === "groq" ? "groq_key_hint" : "openrouter_key_hint";
  const { error } = await createSupabaseAdminClient()
    .from("user_ai_chat_settings")
    .update({ [keyColumn]: null, [hintColumn]: null })
    .eq("user_id", userId);
  if (error) throw new Error("No se pudo eliminar la API key de CoreX AI.");
  return getAiChatSettingsPublic(userId);
}

export async function testAiChatCredential(userId: string): Promise<{ provider: AiChatProvider; model: string }> {
  const credential = await getAiChatCredential(userId);
  if (!credential) throw new Error("Activa el modo BYOK y guarda una API key antes de probarla.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const baseUrl = credential.provider === "groq"
      ? "https://api.groq.com/openai/v1/models"
      : "https://openrouter.ai/api/v1/models";
    const response = await fetch(baseUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${credential.apiKey}` },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("El proveedor rechazó la API key. Revisa el proveedor y vuelve a intentarlo.");
    return { provider: credential.provider, model: credential.model };
  } catch (error) {
    if (error instanceof Error && error.message.includes("rechazó")) throw error;
    throw new Error("No se pudo validar la API key con el proveedor.");
  } finally {
    clearTimeout(timeout);
  }
}
