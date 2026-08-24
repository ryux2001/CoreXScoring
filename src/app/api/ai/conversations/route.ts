import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { listAiConversations } from "@/lib/ai/conversations";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return NextResponse.json({ conversations: [], canSave: false }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    return NextResponse.json({ conversations: await listAiConversations(user.id), canSave: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar el historial de CoreX AI." }, { status: 503 });
  }
}
