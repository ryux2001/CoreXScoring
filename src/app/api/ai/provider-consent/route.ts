import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { grantExternalProviderConsent } from "@/lib/ai/provider-consent";
import type { AiExternalProvider } from "@/lib/ai/privacy";
import { readLimitedJson } from "@/lib/api-security";

export const runtime = "nodejs";

function isProvider(value: unknown): value is AiExternalProvider {
  return value === "groq" || value === "cerebras" || value === "openrouter";
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  let body: { provider?: unknown };
  try {
    body = await readLimitedJson<{ provider?: unknown }>(request, 1 * 1024);
  } catch {
    return NextResponse.json({ error: "La solicitud no es válida." }, { status: 400 });
  }
  if (!isProvider(body.provider)) return NextResponse.json({ error: "Proveedor no permitido." }, { status: 400 });

  try {
    await grantExternalProviderConsent(user.id, body.provider);
    return NextResponse.json({ ok: true, provider: body.provider }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar el consentimiento." }, { status: 503 });
  }
}
