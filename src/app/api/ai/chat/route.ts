import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AiGatewayError, getPotentialExternalProviders, getServerToolCapabilities, isManagedProviderEnabled, runChat, type AiGatewayUserCredential } from "@/lib/ai/gateway";
import { AiActionExecutionError, confirmPendingAction } from "@/lib/ai/actions";
import { resolveDirectVaultLookup } from "@/lib/ai/vault-direct";
import { getAiChatCredential } from "@/lib/ai/chat-settings";
import { appendAiConversationTurn, getAiConversation, getConversationPromptMessages } from "@/lib/ai/conversations";
import {
  AiQuotaUnavailableError,
  AiBudgetUnavailableError,
  AiConcurrencyUnavailableError,
  acquireAiRequestLease,
  consumeAiQuota,
  createAiProviderCircuit,
  estimateTokenBudget,
  getAiQuotaStatus,
  getAnonymousSessionTtlHours,
  getClientIpHash,
  recordAiRequest,
  releaseAiRequestLease,
  settleAiQuota,
  reserveOpenRouterBudget,
  settleOpenRouterBudget,
} from "@/lib/ai/limits";
import { isChatRequest, normalizeMessages, normalizePageContext, type AiFrontendPriceContext, type BuildDraft, type ChatMessage, type ChatProvider, type ChatResponse, type ComboDraft } from "@/lib/ai/types";
import { resolvePageContext } from "@/lib/ai/page-context";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { calculateCatalogPriceEvaluation } from "@/lib/catalog/price-evaluation";
import { resolveAiFrontendPriceContext, resolveAiPagePriceContext } from "@/lib/ai/price-context";
import { ApiRateLimitUnavailableError, readLimitedJson, requireApiRateLimit } from "@/lib/api-security";
import { AI_PRODUCT_SELECT } from "@/lib/ai/privacy";
import { getMissingExternalProviderConsents } from "@/lib/ai/provider-consent";
import { isAiDisabled } from "@/lib/ai/kill-switch";
import { shouldRequireAnonymousTurnstile, TurnstileUnavailableError, verifyTurnstileToken } from "@/lib/ai/turnstile";
import { resolveServerDrafts } from "@/lib/ai/drafts";

export const runtime = "nodejs";

function withRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set("X-CoreX-AI-Request-Id", requestId);
  return response;
}

function getDraftPriceContext(buildDraft?: BuildDraft, comboDraft?: ComboDraft): AiFrontendPriceContext | undefined {
  const draft = buildDraft || comboDraft;
  if (!draft) return undefined;
  const items = Object.entries(draft.components).flatMap(([slot, component]) => (
    component.priceMode === "custom" && component.customPrice !== undefined
      ? [{ productId: component.id, price: component.customPrice, isCustom: true, slot }]
      : []
  ));
  if (items.length === 0) return undefined;
  return {
    scope: buildDraft ? "draft_build" : "draft_combo",
    currency: draft.currency,
    items,
  };
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

async function persistSavedResponse({
  response,
  userId,
  conversationId,
  latestUserMessage,
  buildDraft,
  comboDraft,
}: {
  response: ChatResponse;
  userId: string;
  conversationId?: string;
  latestUserMessage: { role: "user"; content: string };
  buildDraft?: ChatResponse["buildDraft"];
  comboDraft?: ChatResponse["comboDraft"];
}): Promise<ChatResponse> {
  const savedId = await appendAiConversationTurn({
    userId,
    conversationId,
    userMessage: latestUserMessage,
    assistantMessage: response.message,
    buildDraft,
    comboDraft,
    title: conversationId ? undefined : latestUserMessage.content,
  });
  return { ...response, conversationId: savedId };
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
    body = await readLimitedJson(request, 64 * 1024);
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) : 400;
    console.warn("CoreX AI request rejected", { requestId, code: "invalid_json" });
    return withRequestId(NextResponse.json({ error: "Solicitud inválida.", code: "invalid_json", retryable: false }, { status }), requestId);
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
  if (user.is_anonymous === true) {
    const createdAt = Date.parse(user.created_at);
    const ttlMs = getAnonymousSessionTtlHours() * 60 * 60 * 1_000;
    if (Number.isFinite(createdAt) && Date.now() - createdAt > ttlMs) {
      return withRequestId(NextResponse.json({
        error: "Tu sesión de invitado ha caducado. Inicia una nueva sesión para continuar.",
        code: "anonymous_session_expired",
        retryable: false,
      }, { status: 401, headers: { "Cache-Control": "no-store" } }), requestId);
    }
  }
  if (isAiDisabled()) {
    return withRequestId(NextResponse.json(
      { error: "CoreX AI está temporalmente desactivado por mantenimiento.", code: "ai_disabled", retryable: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    ), requestId);
  }
  try {
    const rateLimitResponse = await requireApiRateLimit({
      key: `ai-chat:user:${user.id}`,
      windowSeconds: 60,
      limit: 30,
    });
    if (rateLimitResponse) return withRequestId(rateLimitResponse, requestId);
  } catch (error) {
    if (error instanceof ApiRateLimitUnavailableError) {
      return withRequestId(NextResponse.json({ error: "El límite de seguridad no está disponible." }, { status: 503 }), requestId);
    }
    throw error;
  }
  const quotaAdmin = createSupabaseAdminClient();

  if (body.action) {
    if (user.is_anonymous) {
      return NextResponse.json({ error: "Las acciones de la bóveda requieren una cuenta registrada." }, { status: 403 });
    }

    const actionStartedAt = Date.now();
    const actionIpHash = getClientIpHash(request);
    try {
      const actionQuota = await consumeAiQuota({
        supabase: quotaAdmin,
        userId: user.id,
        ipHash: actionIpHash,
        isAnonymous: false,
        estimatedTokens: 0,
        requestId,
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
      if (!actionQuota.reservationId) throw new AiQuotaUnavailableError();
      await settleAiQuota({
        supabase: quotaAdmin,
        reservationId: actionQuota.reservationId,
        actualTokens: 0,
      });
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
  const conversationMode = body.conversationMode === "saved" ? "saved" : "temporary";
  if (conversationMode === "saved" && isAnonymous) {
    return NextResponse.json({ error: "Los chats guardados requieren una cuenta registrada." }, { status: 403 });
  }
  const ipHash = getClientIpHash(request);
  const startedAt = Date.now();
  const reservedTokens = estimateTokenBudget(normalizedMessages);
  const localProviderEnabled = process.env.AI_LOCAL_ENABLED?.trim().toLowerCase() === "true";
  let completionProvider: ChatProvider = localProviderEnabled ? "local" : "openrouter";
  let completionModel = localProviderEnabled
    ? process.env.AI_LOCAL_MODEL?.trim() || "Qwen3.5-9B-UD-Q4_K_XL"
    : process.env.AI_OPENROUTER_MODELS?.split(",")[0]?.trim() || "openai/gpt-oss-20b";
  let userCredential: AiGatewayUserCredential | undefined;
  let reservationId: string | undefined;
  let budgetReservationId: string | undefined;
  let leaseId: string | undefined;

  try {
    if (isAnonymous) {
      const quotaStatus = await getAiQuotaStatus(supabase);
      if (shouldRequireAnonymousTurnstile(quotaStatus.messagesUsed)) {
        try {
          const verified = await verifyTurnstileToken(body.turnstileToken);
          if (!verified) {
            return withRequestId(NextResponse.json({
              error: "Completa la verificación antiabuso para continuar como invitado.",
              code: body.turnstileToken ? "turnstile_invalid" : "turnstile_required",
              retryable: true,
            }, { status: body.turnstileToken ? 403 : 428, headers: { "Cache-Control": "no-store" } }), requestId);
          }
        } catch (error) {
          if (error instanceof TurnstileUnavailableError) {
            return withRequestId(NextResponse.json({ error: "La verificación antiabuso no está disponible.", code: "turnstile_unavailable", retryable: true }, { status: 503, headers: { "Cache-Control": "no-store" } }), requestId);
          }
          throw error;
        }
      }
    }
    const lease = await acquireAiRequestLease({
      supabase: quotaAdmin,
      requestId,
      userId: user.id,
      ipHash,
      isAnonymous,
    });
    if (!lease.allowed || !lease.leaseId) {
      const retryAfterSeconds = Math.max(1, Math.round(lease.retryAfterSeconds || 5));
      return withRequestId(NextResponse.json({
        error: "CoreX AI está atendiendo otras solicitudes. Inténtalo en unos segundos.",
        code: lease.reason || "ai_concurrency_limit",
        retryable: true,
        retryAfterSeconds,
      }, {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": String(retryAfterSeconds) },
      }), requestId);
    }
    leaseId = lease.leaseId;
    const quota = await consumeAiQuota({
      supabase: quotaAdmin,
      userId: user.id,
      ipHash,
      isAnonymous,
      estimatedTokens: reservedTokens,
      requestId,
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
    if (!quota.reservationId) throw new AiQuotaUnavailableError();
    reservationId = quota.reservationId;

    const latestUserMessage = [...normalizedMessages].reverse().find((message): message is ChatMessage & { role: "user" } => message.role === "user");
    if (!latestUserMessage) {
      return NextResponse.json({ error: "Falta un mensaje del usuario." }, { status: 400 });
    }

    const savedConversation = conversationMode === "saved" && body.conversationId
      ? await getAiConversation(user.id, body.conversationId)
      : null;
    if (conversationMode === "saved" && body.conversationId && !savedConversation) {
      return NextResponse.json({ error: "La conversación no existe o no pertenece a tu cuenta." }, { status: 404 });
    }
    const storedMessages = savedConversation ? getConversationPromptMessages(savedConversation) : [];
    const lastStoredMessage = storedMessages[storedMessages.length - 1];
    const isAlreadyStored = lastStoredMessage?.role === latestUserMessage.role
      && lastStoredMessage.content === latestUserMessage.content;
    const effectiveMessages = (conversationMode === "saved"
      ? [...storedMessages, ...(isAlreadyStored ? [] : [latestUserMessage])]
      : normalizedMessages).slice(-12);
    const serverDrafts = await resolveServerDrafts(
      supabase,
      savedConversation?.state.buildDraft || body.buildDraft,
      savedConversation?.state.comboDraft || body.comboDraft,
    );
    const effectiveBuildDraft = serverDrafts.buildDraft;
    const effectiveComboDraft = serverDrafts.comboDraft;

    const normalizedPageContext = normalizePageContext(body.context);
    const resolvedPageContext = await resolvePageContext(supabase, normalizedPageContext, user.id, isAnonymous);
    const requestedCatalogPriceEvaluation = body.catalogPriceEvaluation
      && resolvedPageContext?.entityType === "product"
      && resolvedPageContext.entityId === body.catalogPriceEvaluation.productId
      ? body.catalogPriceEvaluation
      : undefined;
    let catalogPriceEvaluation = undefined as typeof requestedCatalogPriceEvaluation;
    if (requestedCatalogPriceEvaluation && resolvedPageContext?.entityId) {
      const { data: productForEvaluation } = await supabase
        .from("products")
        .select(AI_PRODUCT_SELECT)
        .eq("id", resolvedPageContext.entityId)
        .maybeSingle();
      const serverEvaluation = productForEvaluation
        ? calculateCatalogPriceEvaluation({
            product: productForEvaluation as unknown as Record<string, unknown>,
            productId: resolvedPageContext.entityId,
            price: requestedCatalogPriceEvaluation.price,
            currency: requestedCatalogPriceEvaluation.currency,
            valueProfile: requestedCatalogPriceEvaluation.valueProfile,
            source: requestedCatalogPriceEvaluation.source || "manual",
          })
        : null;
      if (serverEvaluation) catalogPriceEvaluation = serverEvaluation;
    }
    const frontendPriceContext = await resolveAiFrontendPriceContext(
      supabase,
      body.frontendPriceContext || getDraftPriceContext(effectiveBuildDraft, effectiveComboDraft),
      resolvedPageContext,
    );
    const pagePriceContext = await resolveAiPagePriceContext(supabase, resolvedPageContext);
    const toolContext = {
      supabase,
      actionSupabase: createSupabaseAdminClient() as unknown as typeof supabase,
      requestId,
      actor: {
        id: user.id,
        isAnonymous,
      },
      pageContext: resolvedPageContext,
      ipHash,
      buildDraft: effectiveBuildDraft,
      comboDraft: effectiveComboDraft,
      catalogPriceEvaluation,
      priceContext: frontendPriceContext || pagePriceContext,
      allowedTools: getServerToolCapabilities(effectiveMessages, {
        actor: { id: user.id, isAnonymous },
        buildDraft: effectiveBuildDraft,
        comboDraft: effectiveComboDraft,
        pageContext: resolvedPageContext,
      }),
    };
    userCredential = (await getAiChatCredential(user.id)) || undefined;
    if (userCredential) {
      completionProvider = userCredential.provider;
      completionModel = userCredential.model;
    }

    const directVaultResponse = await resolveDirectVaultLookup(effectiveMessages, toolContext);
    if (directVaultResponse) {
      completionProvider = directVaultResponse.provider;
      completionModel = directVaultResponse.model;
      await settleAiQuota({
        supabase: quotaAdmin,
        reservationId,
        actualTokens: 0,
      });
      if (budgetReservationId) await settleOpenRouterBudget(quotaAdmin, budgetReservationId, 0, 0);
      const savedResponse = conversationMode === "saved" && latestUserMessage
        ? await persistSavedResponse({
          response: directVaultResponse,
          userId: user.id,
          conversationId: body.conversationId,
          latestUserMessage,
          buildDraft: directVaultResponse.buildDraft || effectiveBuildDraft,
          comboDraft: directVaultResponse.comboDraft || effectiveComboDraft,
        })
        : directVaultResponse;
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
      return NextResponse.json(savedResponse, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const missingExternalConsents = await getMissingExternalProviderConsents(
      user.id,
      getPotentialExternalProviders(userCredential),
    );
    if (missingExternalConsents.length > 0) {
      await settleAiQuota({ supabase: quotaAdmin, reservationId, actualTokens: 0 });
      if (budgetReservationId) await settleOpenRouterBudget(quotaAdmin, budgetReservationId, 0, 0);
      return withRequestId(NextResponse.json({
        error: "Antes de usar un proveedor externo debes confirmar la transferencia de datos.",
        code: "external_provider_consent_required",
        providers: missingExternalConsents,
        retryable: false,
      }, { status: 428, headers: { "Cache-Control": "no-store" } }), requestId);
    }

    const projectOpenRouterModel = process.env.AI_OPENROUTER_MODELS?.split(",")[0]?.trim() || "openai/gpt-oss-20b";
    if (!userCredential && !localProviderEnabled && isManagedProviderEnabled("openrouter") && process.env.OPENROUTER_API_KEY?.trim()) {
      const budget = await reserveOpenRouterBudget(quotaAdmin, requestId, projectOpenRouterModel);
      if (!budget.allowed || !budget.reservationId) {
        return NextResponse.json({ error: "El presupuesto mensual de CoreX AI está agotado." }, { status: 429, headers: { "Cache-Control": "no-store" } });
      }
      budgetReservationId = budget.reservationId;
    }

    const completion = await runChat(
      effectiveMessages,
      toolContext,
      requestId,
      userCredential,
      createAiProviderCircuit(quotaAdmin),
      request.signal,
      body.cacheSessionId,
    );

    completionProvider = completion.provider;
    completionModel = completion.model;
    if (budgetReservationId && completion.usage) {
      await settleOpenRouterBudget(
        quotaAdmin,
        budgetReservationId,
        completion.provider === "openrouter" ? completion.usage.inputTokens : 0,
        completion.provider === "openrouter" ? completion.usage.outputTokens : 0,
        completion.provider === "openrouter" ? completion.usage.cachedInputTokens : 0,
        completion.provider === "openrouter" ? completion.usage.cacheWriteTokens : 0,
        completion.model,
      );
    } else if (budgetReservationId && completion.provider === "guardrail") {
      await settleOpenRouterBudget(quotaAdmin, budgetReservationId, 0, 0);
    }
    if (completion.provider === "guardrail") {
      await settleAiQuota({
        supabase: quotaAdmin,
        reservationId,
        actualTokens: 0,
      });
    } else if (completion.usage) {
      await settleAiQuota({
        supabase: quotaAdmin,
        reservationId,
        actualTokens: completion.usage.inputTokens + completion.usage.outputTokens,
      });
    }
    const savedCompletion = conversationMode === "saved"
      ? await persistSavedResponse({
        response: completion,
        userId: user.id,
        conversationId: body.conversationId,
        latestUserMessage,
        buildDraft: completion.buildDraft || effectiveBuildDraft,
        comboDraft: completion.comboDraft || effectiveComboDraft,
      })
      : completion;

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

    return NextResponse.json(savedCompletion, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (reservationId) {
      await settleAiQuota({
        supabase: quotaAdmin,
        reservationId,
        actualTokens: reservedTokens,
      });
    }
    if (budgetReservationId) {
      await settleOpenRouterBudget(quotaAdmin, budgetReservationId, 120_000, 2_400, 0, 0, completionModel);
    }
    if (error instanceof AiQuotaUnavailableError) {
      return NextResponse.json(
        { error: "Las cuotas de CoreX AI no están disponibles. Inténtalo de nuevo más tarde." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (error instanceof AiBudgetUnavailableError) {
      return NextResponse.json({ error: "El presupuesto de CoreX AI no está disponible." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof AiConcurrencyUnavailableError) {
      return NextResponse.json({ error: "Los límites de seguridad de CoreX AI no están disponibles." }, { status: 503, headers: { "Cache-Control": "no-store" } });
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
  } finally {
    if (leaseId) await releaseAiRequestLease(quotaAdmin, leaseId);
  }
}
