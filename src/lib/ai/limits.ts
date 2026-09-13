import { createHmac } from "node:crypto";
import { getRequiredServerSecret } from "@/lib/server-secrets";
import type { NextRequest } from "next/server";
import type { ChatMessage, ChatProvider } from "./types";
import type { AiFailureStage } from "./gateway";
import type { AiSupabaseClient } from "./tools/types";

/** Reserva para hasta seis rondas externas breves, sin infravalorar las tool calls. */
export const AI_RESERVED_OUTPUT_TOKENS = 3_000;
const MAX_ESTIMATED_TOKEN_BUDGET = 20_000;

export type AiQuotaReason = "user_messages" | "ip_messages" | "user_tokens" | "ip_tokens";

export interface AiQuotaDecision {
  allowed: boolean;
  reservationId?: string;
  reason?: AiQuotaReason;
  retryAfterSeconds?: number;
  userRemainingMessages?: number;
  ipRemainingMessages?: number;
}

export interface AiQuotaStatus {
  isAnonymous: boolean;
  messagesUsed: number;
  messagesLimit: number;
  messagesRemaining: number;
  tokensUsed: number;
  tokensLimit: number;
  tokensRemaining: number;
  resetAt: string;
}

export class AiQuotaUnavailableError extends Error {
  constructor() {
    super("No se pudo consultar la cuota de CoreX AI.");
  }
}

export class AiBudgetUnavailableError extends Error {
  constructor() { super("El presupuesto de CoreX AI no está disponible."); }
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
  // Only Cloudflare's origin-protected deployment can attest this header.
  if (process.env.TRUSTED_PROXY?.trim().toLowerCase() !== "cloudflare") return null;
  const candidate = request.headers.get("cf-connecting-ip")?.trim();
  if (!candidate || candidate.length > 128) return null;

  // Quita el puerto de una dirección IPv4 reenviada por algunos proxies.
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    return candidate.slice(0, candidate.lastIndexOf(":"));
  }

  return candidate;
}

export async function reserveOpenRouterBudget(supabase: AiSupabaseClient, requestId: string, model: string) {
  const { data, error } = await supabase.rpc("reserve_openrouter_budget", {
    p_request_id: requestId,
    p_model: model,
    p_input_tokens: 120_000,
    p_output_tokens: 2_400,
  });
  if (error) throw new AiBudgetUnavailableError();
  const result = toRecord(data);
  return { allowed: result.allowed === true, reservationId: typeof result.reservation_id === "string" ? result.reservation_id : undefined };
}

export async function settleOpenRouterBudget(supabase: AiSupabaseClient, reservationId: string, inputTokens: number, outputTokens: number) {
  const { error } = await supabase.rpc("settle_openrouter_budget", {
    p_reservation_id: reservationId,
    p_input_tokens: Math.max(0, Math.round(inputTokens)),
    p_output_tokens: Math.max(0, Math.round(outputTokens)),
  });
  if (error) console.warn("AI budget settlement failed", { code: error.code || "unknown" });
}

/** Devuelve una huella estable de la IP sin persistir nunca la dirección original. */
export function getClientIpHash(request: NextRequest): string | null {
  const ip = getForwardedIp(request);
  if (!ip) return null;

  const secret = getRequiredServerSecret("AI_IP_HASH_SECRET");

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

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Consulta la cuota personal sin reservar mensajes ni crear filas de uso. */
export async function getAiQuotaStatus(supabase: AiSupabaseClient): Promise<AiQuotaStatus> {
  const { data, error } = await supabase.rpc("get_my_ai_quota_status");
  if (error) {
    console.error("AI quota status failed", { code: error.code || "unknown" });
    throw new AiQuotaUnavailableError();
  }

  const result = toRecord(data);
  const resetAt = typeof result.reset_at === "string" ? result.reset_at : "";
  if (!resetAt) throw new AiQuotaUnavailableError();

  return {
    isAnonymous: result.is_anonymous === true,
    messagesUsed: toNumber(result.messages_used),
    messagesLimit: toNumber(result.messages_limit),
    messagesRemaining: toNumber(result.messages_remaining),
    tokensUsed: toNumber(result.tokens_used),
    tokensLimit: toNumber(result.tokens_limit),
    tokensRemaining: toNumber(result.tokens_remaining),
    resetAt,
  };
}

export async function consumeAiQuota({
  supabase,
  userId,
  ipHash,
  isAnonymous,
  estimatedTokens,
  requestId,
}: {
  supabase: AiSupabaseClient;
  userId: string;
  ipHash: string | null;
  isAnonymous: boolean;
  estimatedTokens: number;
  requestId: string;
}): Promise<AiQuotaDecision> {
  const { data, error } = await supabase.rpc("reserve_ai_quota", {
    p_request_id: requestId,
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
    reservationId: typeof result.reservation_id === "string" ? result.reservation_id : undefined,
    reason: typeof result.reason === "string" ? result.reason as AiQuotaReason : undefined,
    retryAfterSeconds: toOptionalNumber(result.retry_after_seconds),
    userRemainingMessages: toOptionalNumber(result.user_remaining_messages),
    ipRemainingMessages: toOptionalNumber(result.ip_remaining_messages),
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
  reservationId,
  actualTokens,
}: {
  supabase: AiSupabaseClient;
  reservationId: string;
  actualTokens: number;
}): Promise<void> {
  try {
    const { error } = await supabase.rpc("settle_ai_quota_reservation", {
      p_reservation_id: reservationId,
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
