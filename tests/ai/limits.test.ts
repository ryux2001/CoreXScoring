import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeAiQuota, estimateTokenBudget, getAiQuotaReservationLimit, getAiQuotaStatus, settleAiQuota } from "@/lib/ai/limits";
import { createSupabaseStub } from "./helpers/query-builder";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function getSqlReservationLimits(migration: string): { rpc: number; table: number } {
  const sql = readFileSync(join(process.cwd(), "supabase", "migrations", migration), "utf8");
  const rpc = sql.match(/p_reserved_tokens\s*>\s*(\d+)/);
  const table = sql.match(/check\s*\(reserved_tokens between 0 and (\d+)\)/i);
  if (!rpc || !table) throw new Error(`Missing quota reservation bounds in ${migration}`);
  return { rpc: Number(rpc[1]), table: Number(table[1]) };
}

describe("AI quota reservation database contract", () => {
  it("keeps a greeting and a long history valid against the existing RPC and table constraint", () => {
    vi.stubEnv("AI_QUOTA_MAX_RESERVATION_TOKENS", "");
    const limits = getSqlReservationLimits("20260912190000_secure_ai_quota_reservations.sql");
    const greeting = estimateTokenBudget([{ role: "user", content: "Hola" }]);
    const longHistory = estimateTokenBudget(Array.from({ length: 12 }, () => ({
      role: "assistant" as const,
      content: "x".repeat(24_000),
    })));

    expect(greeting).toBeGreaterThan(0);
    expect(greeting).toBeLessThanOrEqual(limits.rpc);
    expect(greeting).toBeLessThanOrEqual(limits.table);
    expect(longHistory).toBe(limits.rpc);
    expect(longHistory).toBe(limits.table);
  });

  it("aligns the opt-in expanded reservation limit with both migrated SQL bounds", () => {
    vi.stubEnv("AI_QUOTA_MAX_RESERVATION_TOKENS", "30000");
    const limits = getSqlReservationLimits("20261001100000_align_ai_quota_reservation_limit.sql");

    expect(getAiQuotaReservationLimit()).toBe(limits.rpc);
    expect(getAiQuotaReservationLimit()).toBe(limits.table);
    expect(estimateTokenBudget([{ role: "user", content: "Hola" }])).toBe(21_385);
    expect(estimateTokenBudget([{ role: "assistant", content: "x".repeat(80_000) }])).toBe(limits.rpc);
  });

  it.each(["invalid", "30001", "19999", "25000.5", "Infinity", ""])(
    "uses the database-compatible default for invalid configuration %s",
    (configured) => {
      vi.stubEnv("AI_QUOTA_MAX_RESERVATION_TOKENS", configured);
      expect(getAiQuotaReservationLimit()).toBe(20_000);
    },
  );
});

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

  it("rejects invalid reservation amounts before invoking the RPC", async () => {
    vi.stubEnv("AI_QUOTA_MAX_RESERVATION_TOKENS", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = createSupabaseStub({ data: null, error: null });

    for (const estimatedTokens of [-1, 0.5, Number.NaN, 20_001]) {
      await expect(consumeAiQuota({
        supabase: supabase as never,
        requestId: "request-id",
        userId: "user-id",
        ipHash: null,
        isAnonymous: false,
        estimatedTokens,
      })).rejects.toMatchObject({ code: "ai_quota_invalid_reservation", retryable: false });
    }
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["22023", "ai_quota_invalid_reservation", false],
    ["08006", "ai_quota_unavailable", true],
  ])("classifies database failure %s and logs the request and reservation", async (databaseCode, code, retryable) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = createSupabaseStub({
      data: null,
      error: { code: databaseCode, message: "AI quota reservation failed" },
    });

    await expect(consumeAiQuota({
      supabase: supabase as never,
      requestId: "request-id",
      userId: "user-id",
      ipHash: null,
      isAnonymous: false,
      estimatedTokens: 100,
    })).rejects.toMatchObject({ databaseCode, code, retryable });

    expect(log).toHaveBeenCalledWith("AI quota check failed", expect.objectContaining({
      requestId: "request-id",
      code: databaseCode,
      message: "AI quota reservation failed",
      estimatedTokens: 100,
    }));
  });
});
