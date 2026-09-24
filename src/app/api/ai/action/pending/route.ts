import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AiActionExecutionError, confirmPendingAction } from "@/lib/ai/actions";
import { ApiRateLimitUnavailableError, readLimitedJson, requireApiRateLimit } from "@/lib/api-security";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { AiActionType, PendingAction } from "@/lib/ai/types";

export const runtime = "nodejs";

function withRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set("X-CoreX-AI-Request-Id", requestId);
  return response;
}

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

function asSummary(value: unknown): PendingAction["summary"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const summary = value as Record<string, unknown>;
  const entityType = summary.entityType === "build" || summary.entityType === "combo" ? summary.entityType : undefined;
  const components = Array.isArray(summary.components)
    ? summary.components.flatMap((component) => {
        if (!component || typeof component !== "object" || Array.isArray(component)) return [];
        const row = component as Record<string, unknown>;
        if (typeof row.slot !== "string" || typeof row.id !== "string" || typeof row.name !== "string" || typeof row.type !== "string") return [];
        return [{ slot: row.slot, id: row.id, name: row.name, type: row.type }];
      })
    : undefined;
  return {
    ...(typeof summary.entityTitle === "string" ? { entityTitle: summary.entityTitle } : {}),
    ...(components?.length ? { components } : {}),
    ...(entityType ? { entityType } : {}),
    ...(typeof summary.targetId === "string" ? { targetId: summary.targetId } : {}),
    ...(typeof summary.slot === "string" ? { slot: summary.slot } : {}),
    ...(summary.currency === "USD" || summary.currency === "EUR" ? { currency: summary.currency } : {}),
    ...(typeof summary.price === "number" && Number.isFinite(summary.price) ? { price: summary.price } : {}),
  };
}

function asActionType(value: unknown): AiActionType | null {
  return value === "create_build" || value === "create_combo" || value === "set_custom_price" ? value : null;
}

export async function GET(request: NextRequest) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ actions: [] }, { headers: { "Cache-Control": "no-store" } });

  try {
    const rateLimitResponse = await requireApiRateLimit({ key: `ai-action:user:${user.id}`, windowSeconds: 60, limit: 30 });
    if (rateLimitResponse) return rateLimitResponse;
  } catch (error) {
    if (error instanceof ApiRateLimitUnavailableError) return NextResponse.json({ error: "El límite de seguridad no está disponible." }, { status: 503 });
    throw error;
  }

  const { data, error } = await supabase.rpc("get_ai_pending_actions");
  if (error) return NextResponse.json({ error: "No se pudieron recuperar las acciones pendientes." }, { status: 503 });

  const actions = (Array.isArray(data) ? data : []).flatMap((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return [];
    const item = row as Record<string, unknown>;
    const type = asActionType(item.action_type);
    if (!type || typeof item.id !== "string" || typeof item.payload_digest !== "string" || typeof item.expires_at !== "string") return [];
    const summary = asSummary(item.summary);
    const title = type === "create_build"
      ? "Crear build personalizada"
      : type === "create_combo" ? "Crear combo personalizado" : "Cambiar precio personalizado";
    return [{
      id: item.id,
      type,
      title,
      summary,
      digest: item.payload_digest,
      expiresAt: item.expires_at,
    } satisfies PendingAction];
  });

  return NextResponse.json({ actions }, { headers: { "Cache-Control": "no-store" } });
}

function getErrorStatus(error: unknown): number {
  if (!(error instanceof Error)) return 500;
  return error.message.includes("caducó") || error.message.includes("utilizada") || error.message.includes("pertenece")
    ? 409
    : 400;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  if (!isAllowedOrigin(request)) {
    return withRequestId(NextResponse.json({ error: "Origen no permitido.", code: "origin_not_allowed", retryable: false }, { status: 403 }), requestId);
  }

  let body: { actionId?: unknown; digest?: unknown };
  try {
    body = await readLimitedJson<{ actionId?: unknown; digest?: unknown }>(request, 2 * 1024);
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) : 400;
    return withRequestId(NextResponse.json({ error: "Solicitud inválida.", code: "invalid_json", retryable: false }, { status }), requestId);
  }

  const actionId = typeof body.actionId === "string" ? body.actionId.trim() : "";
  const digest = typeof body.digest === "string" ? body.digest.trim().toLowerCase() : "";
  if (!/^[0-9a-f-]{36}$/i.test(actionId) || !/^[a-f0-9]{64}$/i.test(digest)) {
    return withRequestId(NextResponse.json({ error: "Acción inválida.", code: "invalid_action", retryable: false }, { status: 400 }), requestId);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return withRequestId(NextResponse.json({ error: "La acción requiere una cuenta registrada.", code: "registered_account_required", retryable: false }, { status: 403 }), requestId);
  }

  try {
    const rateLimitResponse = await requireApiRateLimit({ key: `ai-action:user:${user.id}`, windowSeconds: 60, limit: 30 });
    if (rateLimitResponse) return withRequestId(rateLimitResponse, requestId);
  } catch (error) {
    if (error instanceof ApiRateLimitUnavailableError) {
      return withRequestId(NextResponse.json({ error: "El límite de seguridad no está disponible.", code: "rate_limit_unavailable", retryable: true }, { status: 503 }), requestId);
    }
    throw error;
  }

  try {
    const result = await confirmPendingAction(
      { supabase, actor: { id: user.id, isAnonymous: false } },
      actionId,
      digest,
    );
    return withRequestId(NextResponse.json({ confirmed: true, message: result.message }, { headers: { "Cache-Control": "no-store" } }), requestId);
  } catch (error) {
    const status = getErrorStatus(error);
    const actionError = error instanceof AiActionExecutionError ? error : null;
    const code = status === 409 ? "pending_action_conflict" : actionError?.code || "pending_action_failed";
    console.error("CoreX AI action confirmation failed", {
      requestId,
      code,
      databaseCode: actionError?.databaseCode,
      databaseMessage: actionError?.databaseMessage,
      exceptionName: error instanceof Error ? error.name : "unknown_error",
    });
    return withRequestId(NextResponse.json({
      error: error instanceof Error ? error.message : "No se pudo confirmar la acción.",
      code,
      retryable: status !== 409,
    }, { status, headers: { "Cache-Control": "no-store" } }), requestId);
  }
}
