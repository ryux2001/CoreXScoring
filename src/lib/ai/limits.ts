import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import type { ChatMessage, ChatProvider } from "./types";
import type { AiFailureStage } from "./gateway";
import type { AiSupabaseClient } from "./tools/types";

/** La reserva cubre la cadena externa; llama.cpp puede usar más rondas locales sin proveedor externo. */
export const AI_RESERVED_OUTPUT_TOKENS = 6_000;
const MAX_ESTIMATED_TOKEN_BUDGET = 20_000;

export type AiQuotaReason = "user_messages" | "ip_messages" | "user_tokens" | "ip_tokens";

export interface AiWebSearchQuotaDecision {
  allowed: boolean;
  retryAfterSeconds?: number;
  userRemainingSearches?: number;
  ipRemainingSearches?: number;
}

export interface AiQuotaDecision {
  allowed: boolean;
  reason?: AiQuotaReason;
  retryAfterSeconds?: number;
  userRemainingMessages?: number;
  ipRemainingMessages?: number;
}

export class AiQuotaUnavailableError extends Error {
  constructor() {
    super("No se pudo consultar la cuota de CoreX AI.");
  }
}

export interface AiRequestTelemetry {
  userId: string;
  isAnonymous: boolean;
  ipHash: string | null;
  provider: ChatProvider;
  model: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  status: "success" | "error" | "guardrail" | "rate_limited";
  errorCode?: string;
  failureStage?: AiFailureStage;
  providerHttpStatus?: number;
  finishReason?: string | null;
}

function getForwardedIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const candidate = forwardedFor?.split(",")[0]?.trim() || realIp?.trim();
  if (!candidate || candidate.length > 128) return null;

  // Quita el puerto de una dirección IPv4 reenviada por algunos proxies.
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    return candidate.slice(0, candidate.lastIndexOf(":"));
  }

  return candidate;
}

/** Devuelve una huella estable de la IP sin persistir nunca la dirección original. */
export function getClientIpHash(request: NextRequest): string | null {
  const ip = getForwardedIp(request);
  if (!ip) return null;

  const secret = process.env.AI_IP_HASH_SECRET?.trim()
    || process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.GROQ_API_KEY?.trim()
    || "corexscoring-development-ip-hash";

  return createHmac("sha256", secret).update(ip).digest("hex");
}

export function estimateTokenBudget(messages: ChatMessage[]): number {
  const inputTokens = Math.ceil(messages.reduce((total, message) => total + message.content.length, 0) / 4);
  return Math.min(MAX_ESTIMATED_TOKEN_BUDGET, inputTokens + AI_RESERVED_OUTPUT_TOKENS);
}

function toRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function consumeAiQuota({
  supabase,
  userId,
  ipHash,
  isAnonymous,
  estimatedTokens,
}: {
  supabase: AiSupabaseClient;
  userId: string;
  ipHash: string | null;
  isAnonymous: boolean;
  estimatedTokens: number;
}): Promise<AiQuotaDecision> {
  const { data, error } = await supabase.rpc("consume_ai_quota", {
    p_user_id: userId,
    p_ip_hash: ipHash,
    p_is_anonymous: isAnonymous,
    p_reserved_tokens: estimatedTokens,
  });

  if (error) {
    console.error("AI quota check failed", { code: error.code || "unknown" });
    throw new AiQuotaUnavailableError();
  }

  const result = toRecord(data);
  return {
    allowed: result.allowed === true,
    reason: typeof result.reason === "string" ? result.reason as AiQuotaReason : undefined,
    retryAfterSeconds: toOptionalNumber(result.retry_after_seconds),
    userRemainingMessages: toOptionalNumber(result.user_remaining_messages),
    ipRemainingMessages: toOptionalNumber(result.ip_remaining_messages),
  };
}

export class AiWebSearchQuotaUnavailableError extends Error {
  constructor() {
    super("No se pudo consultar la cuota de búsqueda web.");
  }
}

/** Reserva una unidad de búsqueda Tavily sin mezclarla con la cuota de tokens del chat. */
export async function consumeAiWebSearchQuota({
  supabase,
  userId,
  ipHash,
  isAnonymous,
  units,
}: {
  supabase: AiSupabaseClient;
  userId: string;
  ipHash: string | null;
  isAnonymous: boolean;
  units: number;
}): Promise<AiWebSearchQuotaDecision> {
  const { data, error } = await supabase.rpc("consume_ai_web_search_quota", {
    p_user_id: userId,
    p_ip_hash: ipHash,
    p_is_anonymous: isAnonymous,
    p_units: Math.min(Math.max(Math.round(units), 1), 2),
  });

  if (error) {
    console.error("AI web search quota check failed", { code: error.code || "unknown" });
    throw new AiWebSearchQuotaUnavailableError();
  }

  const result = toRecord(data);
  return {
    allowed: result.allowed === true,
    retryAfterSeconds: toOptionalNumber(result.retry_after_seconds),
    userRemainingSearches: toOptionalNumber(result.user_remaining_searches),
    ipRemainingSearches: toOptionalNumber(result.ip_remaining_searches),
  };
}

/** Registra telemetría mínima mediante una RPC que no acepta user_id de otro usuario. */
export async function recordAiRequest(
  supabase: AiSupabaseClient,
  telemetry: AiRequestTelemetry,
): Promise<void> {
  try {
    const { error } = await supabase.rpc("record_ai_request_v2", {
      p_user_id: telemetry.userId,
      p_is_anonymous: telemetry.isAnonymous,
      p_ip_hash: telemetry.ipHash,
      p_provider: telemetry.provider,
      p_model: telemetry.model,
      p_duration_ms: Math.min(Math.max(Math.round(telemetry.durationMs), 0), 600_000),
      p_input_tokens: Math.max(Math.round(telemetry.inputTokens), 0),
      p_output_tokens: Math.max(Math.round(telemetry.outputTokens), 0),
      p_tool_calls: Math.max(Math.round(telemetry.toolCalls), 0),
      p_status: telemetry.status,
      p_error_code: telemetry.errorCode || null,
      p_failure_stage: telemetry.failureStage || null,
      p_provider_http_status: telemetry.providerHttpStatus || null,
      p_finish_reason: telemetry.finishReason || null,
    });

    if (error) {
      // La telemetría nunca debe convertir una respuesta válida en un error para el usuario.
      console.warn("AI telemetry write failed", { code: error.code || "unknown" });
    }
  } catch {
    console.warn("AI telemetry write failed", { code: "network_error" });
  }
}

/** Sustituye la reserva temporal por el consumo real cuando el proveedor lo informa. */
export async function settleAiQuota({
  supabase,
  userId,
  ipHash,
  reservedTokens,
  actualTokens,
}: {
  supabase: AiSupabaseClient;
  userId: string;
  ipHash: string | null;
  reservedTokens: number;
  actualTokens: number;
}): Promise<void> {
  try {
    const { error } = await supabase.rpc("settle_ai_quota", {
      p_user_id: userId,
      p_ip_hash: ipHash,
      p_reserved_tokens: Math.max(Math.round(reservedTokens), 0),
      p_actual_tokens: Math.max(Math.round(actualTokens), 0),
    });

    if (error) {
      console.warn("AI quota settlement failed", { code: error.code || "unknown" });
    }
  } catch {
    // Si falla la liquidación, se conserva la reserva para evitar subestimar el consumo.
    console.warn("AI quota settlement failed", { code: "network_error" });
  }
}
