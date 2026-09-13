import { NextResponse } from "next/server";
import { testAiChatCredential } from "@/lib/ai/chat-settings";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { ApiRateLimitUnavailableError, requireApiRateLimit } from "@/lib/api-security";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "Necesitas una cuenta registrada." }, { status: 401 });
  try {
    const rateLimitResponse = await requireApiRateLimit({ key: `ai-provider:test:user:${user.id}`, windowSeconds: 60, limit: 3 });
    if (rateLimitResponse) return rateLimitResponse;
  } catch (error) {
    if (error instanceof ApiRateLimitUnavailableError) return NextResponse.json({ error: "El límite de seguridad no está disponible." }, { status: 503 });
    throw error;
  }
  try {
    const result = await testAiChatCredential(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo validar la API key." }, { status: 400 });
  }
}
