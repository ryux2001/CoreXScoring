import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { encryptProviderApiKey } from "@/lib/ai/provider-keys";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type Provider = "tavily" | "brave";

function isProvider(value: unknown): value is Provider {
  return value === "tavily" || value === "brave";
}

function keyColumn(provider: Provider): { ciphertext: string; hint: string } {
  return provider === "brave"
    ? { ciphertext: "brave_api_key_ciphertext", hint: "brave_key_hint" }
    : { ciphertext: "tavily_api_key_ciphertext", hint: "tavily_key_hint" };
}

function serializeSettings(row: Record<string, unknown> | null) {
  const preferredProvider = isProvider(row?.preferred_provider)
    ? row.preferred_provider
    : (process.env.WEB_SEARCH_PROVIDER?.trim().toLowerCase() === "brave" ? "brave" : "tavily");
  return {
    preferredProvider,
    tavily: {
      configured: typeof row?.tavily_api_key_ciphertext === "string" && Boolean(row.tavily_api_key_ciphertext),
      hint: typeof row?.tavily_key_hint === "string" ? row.tavily_key_hint : null,
      serverFallback: Boolean(process.env.TAVILY_API_KEY?.trim()),
    },
    brave: {
      configured: typeof row?.brave_api_key_ciphertext === "string" && Boolean(row.brave_api_key_ciphertext),
      hint: typeof row?.brave_key_hint === "string" ? row.brave_key_hint : null,
      serverFallback: Boolean(process.env.BRAVE_SEARCH_API_KEY?.trim()),
    },
  };
}

async function getUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "Necesitas una cuenta registrada." }, { status: 401 });
  const { data, error } = await supabase
    .from("user_ai_web_search_settings")
    .select("preferred_provider,tavily_api_key_ciphertext,tavily_key_hint,brave_api_key_ciphertext,brave_key_hint")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "No se pudieron cargar las claves de búsqueda." }, { status: 503 });
  return NextResponse.json(serializeSettings(data as Record<string, unknown> | null), { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "Necesitas una cuenta registrada." }, { status: 401 });

  let body: { provider?: unknown; apiKey?: unknown };
  try {
    body = await request.json() as { provider?: unknown; apiKey?: unknown };
  } catch {
    return NextResponse.json({ error: "La solicitud no es válida." }, { status: 400 });
  }

  const provider = body.provider;
  if (!isProvider(provider)) return NextResponse.json({ error: "Proveedor no permitido." }, { status: 400 });
  const apiKey = body.apiKey === undefined || body.apiKey === null ? undefined : String(body.apiKey).trim();
  if (apiKey !== undefined && (apiKey.length > 500 || (apiKey && apiKey.length < 12))) {
    return NextResponse.json({ error: "La API key no tiene un formato válido." }, { status: 400 });
  }

  const { data: existing, error: readError } = await supabase
    .from("user_ai_web_search_settings")
    .select("preferred_provider,tavily_api_key_ciphertext,tavily_key_hint,brave_api_key_ciphertext,brave_key_hint")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: "No se pudo leer la configuración de búsqueda." }, { status: 503 });

  const update: Record<string, unknown> = { user_id: user.id, preferred_provider: provider };
  if (apiKey !== undefined) {
    const columns = keyColumn(provider);
    update[columns.ciphertext] = apiKey ? encryptProviderApiKey(apiKey) : null;
    update[columns.hint] = apiKey ? `••••${apiKey.slice(-4)}` : null;
  }

  const query = existing
    ? supabase.from("user_ai_web_search_settings").update(update).eq("user_id", user.id)
    : supabase.from("user_ai_web_search_settings").insert(update);
  const { error } = await query;
  if (error) return NextResponse.json({ error: "No se pudo guardar la configuración de búsqueda." }, { status: 503 });

  const { data } = await supabase
    .from("user_ai_web_search_settings")
    .select("preferred_provider,tavily_api_key_ciphertext,tavily_key_hint,brave_api_key_ciphertext,brave_key_hint")
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json(serializeSettings(data as Record<string, unknown> | null), { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "Necesitas una cuenta registrada." }, { status: 401 });
  let body: { provider?: unknown };
  try {
    body = await request.json() as { provider?: unknown };
  } catch {
    return NextResponse.json({ error: "La solicitud no es válida." }, { status: 400 });
  }
  if (!isProvider(body.provider)) return NextResponse.json({ error: "Proveedor no permitido." }, { status: 400 });
  const columns = keyColumn(body.provider);
  const { error } = await supabase
    .from("user_ai_web_search_settings")
    .update({ [columns.ciphertext]: null, [columns.hint]: null })
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "No se pudo eliminar la API key." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
