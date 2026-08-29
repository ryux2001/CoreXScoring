import { describe, expect, it } from "vitest";
import { getAiQuotaStatus } from "@/lib/ai/limits";
import { createSupabaseStub } from "./helpers/query-builder";

describe("AI quota status", () => {
  it("maps the personal daily quota returned by the protected RPC", async () => {
    const supabase = createSupabaseStub({
      data: {
        is_anonymous: true,
        messages_used: 4,
        messages_limit: 20,
        messages_remaining: 16,
        tokens_used: 1200,
        tokens_limit: 30000,
        tokens_remaining: 28800,
        reset_at: "2026-08-30T00:00:00+00:00",
      },
      error: null,
    });

    await expect(getAiQuotaStatus(supabase as never)).resolves.toEqual({
      isAnonymous: true,
      messagesUsed: 4,
      messagesLimit: 20,
      messagesRemaining: 16,
      tokensUsed: 1200,
      tokensLimit: 30000,
      tokensRemaining: 28800,
      resetAt: "2026-08-30T00:00:00+00:00",
    });
    expect(supabase.rpc).toHaveBeenCalledWith("get_my_ai_quota_status");
  });
});
