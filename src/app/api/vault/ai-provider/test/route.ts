import { NextResponse } from "next/server";
import { testAiChatCredential } from "@/lib/ai/chat-settings";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { ApiRateLimitUnavailableError, requireApiRateLimit } from "@/lib/api-security";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  try {
    const rateLimitResponse = await requireApiRateLimit({ key: `ai-provider:test:user:${user.id}`, windowSeconds: 60, limit: 3 });
    if (rateLimitResponse) return NextResponse.json({ code: "RATE_LIMITED" }, { status: 429, headers: rateLimitResponse.headers });
  } catch (error) {
    if (error instanceof ApiRateLimitUnavailableError) return NextResponse.json({ code: "SECURITY_LIMIT_UNAVAILABLE" }, { status: 503 });
    throw error;
  }
  try {
    const result = await testAiChatCredential(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    console.error("AI provider connection test failed");
    return NextResponse.json({ code: "TEST_FAILED" }, { status: 400 });
  }
}
