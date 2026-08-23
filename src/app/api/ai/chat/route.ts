import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AiGatewayError, runChat } from "@/lib/ai/gateway";
import { AiActionExecutionError, confirmPendingAction } from "@/lib/ai/actions";
import { resolveDirectVaultLookup } from "@/lib/ai/vault-direct";
import {
  AiQuotaUnavailableError,
  consumeAiQuota,
  estimateTokenBudget,
  getClientIpHash,
  recordAiRequest,
  settleAiQuota,
} from "@/lib/ai/limits";
import { isChatRequest, normalizeMessages, normalizePageContext, type ChatProvider } from "@/lib/ai/types";
import { resolvePageContext } from "@/lib/ai/page-context";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function withRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set("X-CoreX-AI-Request-Id", requestId);
  return response;
}

function getGatewayErrorResponse(error: AiGatewayError) {
  if (error.stage === "configuration") {
    return {
      message: "El respaldo de CoreX AI necesita un modelo fijo compatible con tools. Revisa la configuración del servidor.",
      code: error.code || "ai_configuration_error",
      retryable: false,
    };
  }

  if (error.code === "unstructured_tool_plan" || error.code === "tool_loop_limit") {
    return {
      message: "CoreX AI no pudo completar esta acción de forma segura. Puedes reformularla o reintentarla.",
      code: error.code,
      retryable: true,
    };
  }

  if (error.status === 429) {
    return {
      message: "CoreX AI alcanzó un límite temporal del proveedor. Espera un momento antes de reintentar.",
      code: error.code || "provider_rate_limited",
      retryable: true,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }

  return {
    message: "El proveedor de CoreX AI no está disponible en este momento. Inténtalo de nuevo.",
    code: error.code || "provider_error",
    retryable: error.retryable,
  };
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    console.warn("CoreX AI request rejected", { requestId, code: "origin_not_allowed" });
    return withRequestId(NextResponse.json({ error: "Origen no permitido.", code: "origin_not_allowed", retryable: false }, { status: 403 }), requestId);
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    console.warn("CoreX AI request rejected", { requestId, code: "content_type_invalid" });
    return withRequestId(NextResponse.json({ error: "El contenido debe ser JSON.", code: "content_type_invalid", retryable: false }, { status: 415 }), requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.warn("CoreX AI request rejected", { requestId, code: "invalid_json" });
    return withRequestId(NextResponse.json({ error: "Solicitud inválida.", code: "invalid_json", retryable: false }, { status: 400 }), requestId);
  }

  if (!isChatRequest(body)) {
    console.warn("CoreX AI request rejected", { requestId, code: "invalid_chat_request" });
    return withRequestId(NextResponse.json({ error: "El historial de mensajes no es válido.", code: "invalid_chat_request", retryable: false }, { status: 400 }), requestId);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn("CoreX AI request rejected", { requestId, code: "missing_session" });
    return withRequestId(NextResponse.json(
      { error: "No se pudo identificar tu sesión de CoreX AI. Recarga la página e inténtalo de nuevo." },
      { status: 401 },
    ), requestId);
  }

  if (body.action) {
    if (user.is_anonymous) {
      return NextResponse.json({ error: "Las acciones de la bóveda requieren una cuenta registrada." }, { status: 403 });
    }

    const actionStartedAt = Date.now();
    const actionIpHash = getClientIpHash(request);
    try {
      const actionQuota = await consumeAiQuota({
        supabase,
        userId: user.id,
        ipHash: actionIpHash,
        isAnonymous: false,
        estimatedTokens: 0,
      });

      if (!actionQuota.allowed) {
        const retryAfterSeconds = Math.max(1, Math.round(actionQuota.retryAfterSeconds || 60));
        await recordAiRequest(supabase, {
          userId: user.id,
          isAnonymous: false,
          ipHash: actionIpHash,
          provider: "guardrail",
          model: "action-confirmation",
          durationMs: Date.now() - actionStartedAt,
          inputTokens: 0,
          outputTokens: 0,
          toolCalls: 0,
          status: "rate_limited",
          errorCode: actionQuota.reason,
        });
        return NextResponse.json({ error: "Se alcanzó tu cuota temporal de CoreX AI. Inténtalo más tarde." }, {
          status: 429,
          headers: { "Cache-Control": "no-store", "Retry-After": String(retryAfterSeconds) },
        });
      }
    } catch (error) {
      if (error instanceof AiQuotaUnavailableError) {
        return NextResponse.json({ error: "Las cuotas de CoreX AI no están disponibles. Inténtalo de nuevo más tarde." }, { status: 503 });
      }
      return NextResponse.json({ error: "No se pudo validar la cuota de la acción." }, { status: 503 });
    }

    try {
      const result = await confirmPendingAction(
        {
          supabase,
          actor: { id: user.id, isAnonymous: false },
          pageContext: normalizePageContext(body.context),
        },
        body.action.id,
        body.action.digest,
      );

      await recordAiRequest(supabase, {
        userId: user.id,
        isAnonymous: false,
        ipHash: actionIpHash,
        provider: "guardrail",
        model: "action-confirmation",
        durationMs: Date.now() - actionStartedAt,
        inputTokens: 0,
        outputTokens: 0,
        toolCalls: 0,
        status: "guardrail",
      });

      return NextResponse.json({
        message: { role: "assistant", content: result.message },
        provider: "guardrail",
        model: "action-confirmation",
      }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo confirmar la acción.";
      const status = message.includes("caducó") || message.includes("utilizada") || message.includes("pertenece") ? 409 : 400;
      const actionError = error instanceof AiActionExecutionError ? error : null;
      console.error("CoreX AI action confirmation failed", {
        requestId,
        code: actionError?.code || "pending_action_failed",
        databaseCode: actionError?.databaseCode,
        databaseMessage: actionError?.databaseMessage,
        exceptionName: error instanceof Error ? error.name : "unknown_error",
      });
      await recordAiRequest(supabase, {
        userId: user.id,
        isAnonymous: false,
        ipHash: actionIpHash,
        provider: "guardrail",
        model: "action-confirmation",
        durationMs: Date.now() - actionStartedAt,
        inputTokens: 0,
        outputTokens: 0,
        toolCalls: 0,
        status: "error",
        errorCode: status === 409 ? "pending_action_conflict" : actionError?.code || "pending_action_failed",
      });
      return withRequestId(NextResponse.json(
        {
          error: message,
          code: status === 409 ? "pending_action_conflict" : actionError?.code || "pending_action_failed",
          requestId,
          retryable: false,
        },
        { status, headers: { "Cache-Control": "no-store" } },
      ), requestId);
    }
  }

  const normalizedMessages = normalizeMessages(body.messages);
  const isAnonymous = user.is_anonymous === true;
  const ipHash = getClientIpHash(request);
  const startedAt = Date.now();
  const reservedTokens = estimateTokenBudget(normalizedMessages);
  const localProviderEnabled = process.env.AI_LOCAL_ENABLED?.trim().toLowerCase() === "true";
  let completionProvider: ChatProvider = localProviderEnabled ? "local" : "groq";
  let completionModel = localProviderEnabled
    ? process.env.AI_LOCAL_MODEL?.trim() || "Qwen3.5-9B-UD-Q4_K_XL"
    : process.env.AI_GROQ_MODEL?.trim() || "openai/gpt-oss-20b";

  try {
    const quota = await consumeAiQuota({
      supabase,
      userId: user.id,
      ipHash,
      isAnonymous,
      estimatedTokens: reservedTokens,
    });

    if (!quota.allowed) {
      const retryAfterSeconds = Math.max(1, Math.round(quota.retryAfterSeconds || 60));
      const message = quota.reason?.startsWith("ip_")
        ? "Se alcanzó el límite temporal de uso para esta red. Inténtalo más tarde."
        : "Se alcanzó tu cuota temporal de CoreX AI. Inténtalo más tarde.";

      await recordAiRequest(supabase, {
        userId: user.id,
        isAnonymous,
        ipHash,
        provider: "guardrail",
        model: "quota",
        durationMs: Date.now() - startedAt,
        inputTokens: 0,
        outputTokens: 0,
        toolCalls: 0,
        status: "rate_limited",
        errorCode: quota.reason,
      });

      return NextResponse.json({ error: message }, {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": String(retryAfterSeconds) },
      });
    }

    const normalizedPageContext = normalizePageContext(body.context);
    const resolvedPageContext = await resolvePageContext(supabase, normalizedPageContext, user.id, isAnonymous);
    const toolContext = {
      supabase,
      actor: {
        id: user.id,
        isAnonymous,
      },
      pageContext: resolvedPageContext,
      ipHash,
      buildDraft: body.buildDraft,
      comboDraft: body.comboDraft,
    };
    const directVaultResponse = await resolveDirectVaultLookup(normalizedMessages, toolContext);
    if (directVaultResponse) {
      completionProvider = directVaultResponse.provider;
      completionModel = directVaultResponse.model;
      await settleAiQuota({
        supabase,
        userId: user.id,
        ipHash,
        reservedTokens,
        actualTokens: 0,
      });
      await recordAiRequest(supabase, {
        userId: user.id,
        isAnonymous,
        ipHash,
        provider: "guardrail",
        model: directVaultResponse.model,
        durationMs: Date.now() - startedAt,
        inputTokens: 0,
        outputTokens: 0,
        toolCalls: directVaultResponse.toolCalls || 0,
        status: "guardrail",
      });
      return NextResponse.json(directVaultResponse, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const completion = await runChat(normalizedMessages, toolContext, requestId);

    completionProvider = completion.provider;
    completionModel = completion.model;
    if (completion.provider === "guardrail") {
      await settleAiQuota({
        supabase,
        userId: user.id,
        ipHash,
        reservedTokens,
        actualTokens: 0,
      });
    } else if (completion.usage) {
      await settleAiQuota({
        supabase,
        userId: user.id,
        ipHash,
        reservedTokens,
        actualTokens: completion.usage.inputTokens + completion.usage.outputTokens,
      });
    }
    await recordAiRequest(supabase, {
      userId: user.id,
      isAnonymous,
      ipHash,
      provider: completion.provider,
      model: completion.model,
      durationMs: Date.now() - startedAt,
      inputTokens: completion.usage?.inputTokens || 0,
      outputTokens: completion.usage?.outputTokens || 0,
      toolCalls: completion.toolCalls || 0,
      status: completion.provider === "guardrail" ? "guardrail" : "success",
    });

    return NextResponse.json(completion, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AiQuotaUnavailableError) {
      return NextResponse.json(
        { error: "Las cuotas de CoreX AI no están disponibles. Inténtalo de nuevo más tarde." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const gatewayError = error instanceof AiGatewayError ? error : null;
    if (gatewayError?.provider) {
      completionProvider = gatewayError.provider;
      completionModel = gatewayError.model || (gatewayError.provider === "local"
        ? process.env.AI_LOCAL_MODEL?.trim() || "Qwen3.5-9B-UD-Q4_K_XL"
        : gatewayError.provider === "openrouter"
        ? process.env.AI_OPENROUTER_MODELS?.split(",")[0]?.trim() || "openai/gpt-oss-20b:free"
        : gatewayError.provider === "cerebras"
          ? process.env.AI_CEREBRAS_MODELS?.split(",")[0]?.trim() || "gpt-oss-120b"
          : process.env.AI_GROQ_MODELS?.split(",")[0]?.trim() || "openai/gpt-oss-20b");
    }

    await recordAiRequest(supabase, {
      userId: user.id,
      isAnonymous,
      ipHash,
      provider: completionProvider,
      model: completionModel,
      durationMs: Date.now() - startedAt,
      inputTokens: 0,
      outputTokens: 0,
      toolCalls: gatewayError?.toolCalls || 0,
      status: "error",
      errorCode: gatewayError
        ? `${gatewayError.stage}:${gatewayError.code || "unknown"}`
        : "unknown:provider_or_tool_error",
      failureStage: gatewayError?.stage,
      providerHttpStatus: gatewayError?.status,
      finishReason: gatewayError?.finishReason,
    });

    console.error("CoreX AI request failed", {
      requestId,
      isAnonymous,
      provider: gatewayError?.provider || completionProvider,
      model: completionModel,
      stage: gatewayError?.stage || "unknown",
      code: gatewayError?.code || "unexpected_error",
      providerHttpStatus: gatewayError?.status,
      finishReason: gatewayError?.finishReason,
      providerMessage: gatewayError?.providerMessage,
      toolCalls: gatewayError?.toolCalls || 0,
      exceptionName: error instanceof Error ? error.name : "unknown_error",
      exceptionMessage: error instanceof Error ? error.message.slice(0, 500) : undefined,
    });

    if (gatewayError) {
      const response = getGatewayErrorResponse(gatewayError);
      const retryAfterSeconds = "retryAfterSeconds" in response ? response.retryAfterSeconds : undefined;
      const headers: Record<string, string> = { "Cache-Control": "no-store" };
      if (retryAfterSeconds) headers["Retry-After"] = String(retryAfterSeconds);
      return withRequestId(NextResponse.json(
        { error: response.message, code: response.code, retryable: response.retryable, requestId, retryAfterSeconds },
        {
          status: gatewayError.status === 429
            ? 429
            : gatewayError.stage === "response" || gatewayError.stage === "tool_loop" ? 502 : 503,
          headers,
        },
      ), requestId);
    }

    return withRequestId(NextResponse.json(
      { error: "El asistente no está disponible en este momento. Inténtalo de nuevo.", code: "unexpected_error", retryable: true, requestId },
      { status: 503 },
    ), requestId);
  }
}
