import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runChat } from "@/lib/ai/gateway";
import {
  AiQuotaUnavailableError,
  consumeAiQuota,
  estimateTokenBudget,
  getClientIpHash,
  recordAiRequest,
  settleAiQuota,
} from "@/lib/ai/limits";
import { isChatRequest, normalizeMessages, normalizePageContext } from "@/lib/ai/types";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "El contenido debe ser JSON." }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!isChatRequest(body)) {
    return NextResponse.json({ error: "El historial de mensajes no es válido." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "No se pudo identificar tu sesión de CoreX AI. Recarga la página e inténtalo de nuevo." },
      { status: 401 },
    );
  }

  const normalizedMessages = normalizeMessages(body.messages);
  const isAnonymous = user.is_anonymous === true;
  const ipHash = getClientIpHash(request);
  const startedAt = Date.now();
  const reservedTokens = estimateTokenBudget(normalizedMessages);
  let completionProvider: "groq" | "openrouter" | "guardrail" = "groq";
  let completionModel = process.env.AI_GROQ_MODEL?.trim() || "openai/gpt-oss-20b";

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

    const completion = await runChat(normalizedMessages, {
      supabase,
      actor: {
        id: user.id,
        isAnonymous,
      },
      pageContext: normalizePageContext(body.context),
    });

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

    await recordAiRequest(supabase, {
      userId: user.id,
      isAnonymous,
      ipHash,
      provider: completionProvider,
      model: completionModel,
      durationMs: Date.now() - startedAt,
      inputTokens: 0,
      outputTokens: 0,
      toolCalls: 0,
      status: "error",
      errorCode: "provider_or_tool_error",
    });

    console.error("AI chat request failed", {
      userId: user.id,
      isAnonymous,
      message: error instanceof Error ? error.message : "unknown_error",
    });

    return NextResponse.json(
      { error: "El asistente no está disponible en este momento. Inténtalo de nuevo." },
      { status: 503 },
    );
  }
}
