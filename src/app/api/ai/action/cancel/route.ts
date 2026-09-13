import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });

  let body: { actionId?: unknown };
  try { body = await request.json() as { actionId?: unknown }; } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const actionId = typeof body.actionId === "string" ? body.actionId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(actionId)) return NextResponse.json({ error: "Acción inválida." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "La acción requiere una cuenta registrada." }, { status: 403 });

  const { error } = await supabase.rpc("cancel_ai_pending_action", { p_action_id: actionId });
  if (error) return NextResponse.json({ error: "La acción ya no puede cancelarse." }, { status: error.code === "P0002" ? 409 : 503 });
  return NextResponse.json({ cancelled: true }, { headers: { "Cache-Control": "no-store" } });
}
