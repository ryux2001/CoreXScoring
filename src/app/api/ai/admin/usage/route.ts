import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function parseDays(request: NextRequest): number | null {
  const rawDays = request.nextUrl.searchParams.get("days");
  if (rawDays === null || rawDays.trim() === "") return 7;

  const days = Number(rawDays);
  if (!Number.isInteger(days) || days < 1 || days > 31) return null;
  return days;
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const days = parseDays(request);
  if (days === null) {
    return NextResponse.json({ error: "El período debe estar entre 1 y 31 días." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_ai_admin_usage", { p_days: days });
  if (error) {
    if (error.code === "42501") {
      return NextResponse.json({ error: "No tienes permisos de administrador." }, { status: 403 });
    }

    console.error("AI admin usage query failed", { code: error.code || "unknown" });
    return NextResponse.json({ error: "No se pudieron consultar las métricas de IA." }, { status: 503 });
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
