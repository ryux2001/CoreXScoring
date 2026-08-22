import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  if (user.is_anonymous || user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "No tienes permisos de administrador." }, { status: 403 });
  }

  let retentionDays = 90;
  try {
    const body = await request.json() as { retentionDays?: unknown };
    if (body.retentionDays !== undefined) retentionDays = Number(body.retentionDays);
  } catch {
    // Un cuerpo vacío usa la retención predeterminada.
  }

  if (!Number.isInteger(retentionDays) || retentionDays < 30 || retentionDays > 730) {
    return NextResponse.json({ error: "La retención debe estar entre 30 y 730 días." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("cleanup_ai_telemetry", {
    p_retention_days: retentionDays,
  });

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json({ error: "No tienes permisos de administrador." }, { status: 403 });
    }

    console.error("AI telemetry cleanup failed", { code: error.code || "unknown" });
    return NextResponse.json({ error: "No se pudo ejecutar la limpieza de telemetría." }, { status: 503 });
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
