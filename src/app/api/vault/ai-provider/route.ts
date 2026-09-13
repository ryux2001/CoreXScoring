import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAiChatSettingsPublic,
  removeAiChatKey,
  saveAiChatSettings,
} from "@/lib/ai/chat-settings";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { AiChatProvider, AiCredentialMode } from "@/lib/ai/types";
import { ApiRateLimitUnavailableError, readLimitedJson, requireApiRateLimit } from "@/lib/api-security";

export const runtime = "nodejs";

function isProvider(value: unknown): value is AiChatProvider {
  return value === "groq" || value === "cerebras" || value === "openrouter";
}

function isMode(value: unknown): value is AiCredentialMode {
  return value === "project" || value === "byok";
}

async function getUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && !user.is_anonymous ? user : null;
}

function allowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Necesitas una cuenta registrada." }, { status: 401 });
  try {
    return NextResponse.json(await getAiChatSettingsPublic(user.id), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar la configuración de CoreX AI." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Necesitas una cuenta registrada." }, { status: 401 });
  try {
    const rateLimitResponse = await requireApiRateLimit({ key: `ai-provider:update:user:${user.id}`, windowSeconds: 60, limit: 10 });
    if (rateLimitResponse) return rateLimitResponse;
  } catch (error) {
    if (error instanceof ApiRateLimitUnavailableError) return NextResponse.json({ error: "El límite de seguridad no está disponible." }, { status: 503 });
    throw error;
  }

  let body: { credentialMode?: unknown; provider?: unknown; model?: unknown; apiKey?: unknown };
  try { body = await readLimitedJson<typeof body>(request, 4 * 1024); } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) : 400;
    return NextResponse.json({ error: "La solicitud no es válida." }, { status });
  }
  if (!isMode(body.credentialMode) || !isProvider(body.provider) || typeof body.model !== "string" || body.model.length > 200) {
    return NextResponse.json({ error: "La configuración de proveedor no es válida." }, { status: 400 });
  }

  const apiKey = body.apiKey === undefined || body.apiKey === null ? undefined : String(body.apiKey).trim();
  if (apiKey !== undefined && (apiKey.length < 12 || apiKey.length > 500)) {
    return NextResponse.json({ error: "La API key no tiene un formato válido." }, { status: 400 });
  }

  try {
    return NextResponse.json(await saveAiChatSettings({
      userId: user.id,
      credentialMode: body.credentialMode,
      provider: body.provider,
      model: body.model,
      apiKey,
    }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la configuración." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Necesitas una cuenta registrada." }, { status: 401 });
  try {
    const rateLimitResponse = await requireApiRateLimit({ key: `ai-provider:update:user:${user.id}`, windowSeconds: 60, limit: 10 });
    if (rateLimitResponse) return rateLimitResponse;
  } catch (error) {
    if (error instanceof ApiRateLimitUnavailableError) return NextResponse.json({ error: "El límite de seguridad no está disponible." }, { status: 503 });
    throw error;
  }
  let body: { provider?: unknown };
  try { body = await readLimitedJson<typeof body>(request, 4 * 1024); } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) : 400;
    return NextResponse.json({ error: "La solicitud no es válida." }, { status });
  }
  if (!isProvider(body.provider)) return NextResponse.json({ error: "Proveedor no permitido." }, { status: 400 });
  try {
    return NextResponse.json(await removeAiChatKey(user.id, body.provider), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo eliminar la API key." }, { status: 503 });
  }
}
