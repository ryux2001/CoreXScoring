import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { deleteAiConversation, getAiConversation, renameAiConversation } from "@/lib/ai/conversations";
import { ApiRateLimitUnavailableError, readLimitedJson, requireApiRateLimit } from "@/lib/api-security";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

async function getRegisteredUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && !user.is_anonymous ? user : null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getRegisteredUser();
  if (!user) return NextResponse.json({ error: "Necesitas una cuenta registrada." }, { status: 401 });
  const { id } = await context.params;
  try {
    const conversation = await getAiConversation(user.id, id);
    if (!conversation) return NextResponse.json({ error: "La conversación no existe." }, { status: 404 });
    return NextResponse.json({ conversation }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar la conversación." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  const user = await getRegisteredUser();
  if (!user) return NextResponse.json({ error: "Necesitas una cuenta registrada." }, { status: 401 });
  try {
    const rateLimitResponse = await requireApiRateLimit({ key: `ai-conversation:user:${user.id}`, windowSeconds: 60, limit: 30 });
    if (rateLimitResponse) return rateLimitResponse;
  } catch (error) {
    if (error instanceof ApiRateLimitUnavailableError) return NextResponse.json({ error: "El límite de seguridad no está disponible." }, { status: 503 });
    throw error;
  }
  const { id } = await context.params;
  let body: { title?: unknown };
  try { body = await readLimitedJson<{ title?: unknown }>(request, 1 * 1024); } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) : 400;
    return NextResponse.json({ error: "La solicitud no es válida." }, { status });
  }
  if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 80) {
    return NextResponse.json({ error: "El título debe tener entre 1 y 80 caracteres." }, { status: 400 });
  }
  try {
    await renameAiConversation(user.id, id, body.title);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo renombrar la conversación.";
    return NextResponse.json({ error: message }, { status: message.includes("no existe") ? 404 : 503 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  const user = await getRegisteredUser();
  if (!user) return NextResponse.json({ error: "Necesitas una cuenta registrada." }, { status: 401 });
  try {
    const rateLimitResponse = await requireApiRateLimit({ key: `ai-conversation:user:${user.id}`, windowSeconds: 60, limit: 30 });
    if (rateLimitResponse) return rateLimitResponse;
  } catch (error) {
    if (error instanceof ApiRateLimitUnavailableError) return NextResponse.json({ error: "El límite de seguridad no está disponible." }, { status: 503 });
    throw error;
  }
  const { id } = await context.params;
  try {
    await deleteAiConversation(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar la conversación.";
    return NextResponse.json({ error: message }, { status: message.includes("no existe") ? 404 : 503 });
  }
}
