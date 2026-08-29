import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AiQuotaUnavailableError, getAiQuotaStatus } from "@/lib/ai/limits";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  try {
    const quota = await getAiQuotaStatus(supabase);
    return NextResponse.json(quota, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AiQuotaUnavailableError) {
      return NextResponse.json({ error: "No se pudo consultar tu cuota de CoreX AI." }, { status: 503 });
    }
    return NextResponse.json({ error: "No se pudo consultar tu cuota de CoreX AI." }, { status: 503 });
  }
}
