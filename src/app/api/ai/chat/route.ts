import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runChat } from "@/lib/ai/gateway";
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
      { error: "Inicia sesión para usar el asistente de IA." },
      { status: 401 },
    );
  }

  try {
    const completion = await runChat(normalizeMessages(body.messages), {
      supabase,
      pageContext: normalizePageContext(body.context),
    });
    return NextResponse.json(completion, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("AI chat request failed", {
      userId: user.id,
      message: error instanceof Error ? error.message : "unknown_error",
    });

    return NextResponse.json(
      { error: "El asistente no está disponible en este momento. Inténtalo de nuevo." },
      { status: 503 },
    );
  }
}
