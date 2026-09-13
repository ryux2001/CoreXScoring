import { describe, expect, it } from "vitest";
import { consumeAiQuota, getAiQuotaStatus, settleAiQuota } from "@/lib/ai/limits";
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

describe("AI quota reservations", () => {
  it("reserves quotas with a server request ID and returns an opaque reservation ID", async () => {
    const supabase = createSupabaseStub({
      data: {
        allowed: true,
        reservation_id: "c34f0634-064d-49a2-8069-98d022c329de",
        user_remaining_messages: 19,
      },
      error: null,
    });

    await expect(consumeAiQuota({
      supabase: supabase as never,
      requestId: "3faa2d8c-4aa1-4f2b-bf42-5902d6521b4a",
      userId: "70fea30d-0fe4-4703-a6fd-bd34ab8c27f5",
      ipHash: "server-derived-ip-hash",
      isAnonymous: true,
      estimatedTokens: 3000,
    })).resolves.toMatchObject({ allowed: true, reservationId: "c34f0634-064d-49a2-8069-98d022c329de" });

    expect(supabase.rpc).toHaveBeenCalledWith("reserve_ai_quota", {
      p_request_id: "3faa2d8c-4aa1-4f2b-bf42-5902d6521b4a",
      p_user_id: "70fea30d-0fe4-4703-a6fd-bd34ab8c27f5",
      p_ip_hash: "server-derived-ip-hash",
      p_is_anonymous: true,
      p_reserved_tokens: 3000,
    });
  });

  it("settles only by the opaque reservation ID", async () => {
    const supabase = createSupabaseStub({ data: null, error: null });

    await settleAiQuota({
      supabase: supabase as never,
      reservationId: "c34f0634-064d-49a2-8069-98d022c329de",
      actualTokens: 125,
    });

    expect(supabase.rpc).toHaveBeenCalledWith("settle_ai_quota_reservation", {
      p_reservation_id: "c34f0634-064d-49a2-8069-98d022c329de",
      p_actual_tokens: 125,
    });
  });
});
