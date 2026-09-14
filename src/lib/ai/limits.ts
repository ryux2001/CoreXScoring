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

export class AiConcurrencyUnavailableError extends Error {
  constructor() { super("Los límites de concurrencia de CoreX AI no están disponibles."); }
}

export interface AiRequestLeaseDecision {
  allowed: boolean;
  leaseId?: string;
  reason?: string;
  retryAfterSeconds?: number;
}

export function getAnonymousSessionTtlHours(): number {
  const value = Number(process.env.AI_ANONYMOUS_SESSION_TTL_HOURS ?? 24);
  return Number.isInteger(value) && value >= 1 && value <= 168 ? value : 24;
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
  // Only the selected edge provider can attest its client-IP header.
  const trustedProxy = process.env.TRUSTED_PROXY?.trim().toLowerCase();
  const candidate = trustedProxy === "cloudflare"
    ? request.headers.get("cf-connecting-ip")?.trim()
    : trustedProxy === "vercel"
      ? request.headers.get("x-vercel-forwarded-for")?.trim()
      : null;
  if (!candidate || candidate.length > 128) return null;
  if (candidate.includes(",")) return null;

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

export async function settleOpenRouterBudget(
  supabase: AiSupabaseClient,
  reservationId: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens = 0,
  cacheWriteTokens = 0,
  actualModel = "openrouter/free",
) {
  const { error } = await supabase.rpc("settle_openrouter_budget", {
    p_reservation_id: reservationId,
    p_input_tokens: Math.max(0, Math.round(inputTokens)),
    p_output_tokens: Math.max(0, Math.round(outputTokens)),
    p_cached_input_tokens: Math.max(0, Math.round(cachedInputTokens)),
    p_cache_write_tokens: Math.max(0, Math.round(cacheWriteTokens)),
    p_actual_model: actualModel,
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
  // Reserve room for the system policy, verified page context and tool schemas.
  const promptOverhead = 5_000;
  return Math.min(MAX_ESTIMATED_TOKEN_BUDGET, inputTokens + promptOverhead + AI_RESERVED_OUTPUT_TOKENS);
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

export async function acquireAiRequestLease({
  supabase,
  requestId,
  userId,
  ipHash,
  isAnonymous,
  scope = "ai",
}: {
  supabase: AiSupabaseClient;
  requestId: string;
  userId: string;
  ipHash: string | null;
  isAnonymous: boolean;
  scope?: string;
}): Promise<AiRequestLeaseDecision> {
  const { data, error } = await supabase.rpc("acquire_ai_request_lease", {
    p_request_id: requestId,
    p_user_id: userId,
    p_ip_hash: ipHash,
    p_is_anonymous: isAnonymous,
    p_scope: scope,
  });
  if (error) {
    console.error("AI concurrency lease failed", { code: error.code || "unknown" });
    throw new AiConcurrencyUnavailableError();
  }
  const result = toRecord(data);
  return {
    allowed: result.allowed === true,
    leaseId: typeof result.lease_id === "string" ? result.lease_id : undefined,
    reason: typeof result.reason === "string" ? result.reason : undefined,
    retryAfterSeconds: toOptionalNumber(result.retry_after_seconds),
  };
}

export async function releaseAiRequestLease(supabase: AiSupabaseClient, leaseId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("release_ai_request_lease", { p_lease_id: leaseId });
    if (error) console.warn("AI concurrency lease release failed", { code: error.code || "unknown" });
  } catch {
    console.warn("AI concurrency lease release failed", { code: "network_error" });
  }
}

export interface AiProviderCircuit {
  isAllowed(provider: string, model: string): Promise<boolean>;
  recordSuccess(provider: string, model: string): Promise<void>;
  recordFailure(provider: string, model: string, isTimeout: boolean): Promise<void>;
}

export function createAiProviderCircuit(supabase: AiSupabaseClient): AiProviderCircuit {
  return {
    async isAllowed(provider, model) {
      const { data, error } = await supabase.rpc("check_ai_provider_circuit", {
        p_provider: provider,
        p_model: model,
      });
      if (error) throw new AiConcurrencyUnavailableError();
      return toRecord(data).allowed === true;
    },
    async recordSuccess(provider, model) {
      const { error } = await supabase.rpc("record_ai_provider_success", {
        p_provider: provider,
        p_model: model,
      });
      if (error) console.warn("AI provider circuit success update failed", { code: error.code || "unknown" });
    },
    async recordFailure(provider, model, isTimeout) {
      const { error } = await supabase.rpc("record_ai_provider_failure", {
        p_provider: provider,
        p_model: model,
        p_is_timeout: isTimeout,
      });
      if (error) console.warn("AI provider circuit failure update failed", { code: error.code || "unknown" });
    },
  };
}
