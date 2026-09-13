import { describe, expect, it, vi } from "vitest";
import { confirmPendingAction } from "@/lib/ai/actions";
import { createSupabaseStub } from "./helpers/query-builder";
import { ownBuildFixture } from "./helpers/fixtures";

describe("AI pending actions", () => {
  it("does not allow anonymous confirmation", async () => {
    await expect(confirmPendingAction({
      supabase: {} as never,
      actor: { id: "anonymous", isAnonymous: true },
    }, "action-1", "a".repeat(64))).rejects.toThrow("requieren una cuenta registrada");
  });

  it("rejects an expired, consumed or foreign proposal", async () => {
    const supabase = createSupabaseStub({ data: null, error: { code: "P0002" } });
    await expect(confirmPendingAction({
      supabase: supabase as never,
      actor: { id: "user-1", isAnonymous: false },
    }, "action-1", "a".repeat(64))).rejects.toThrow("ya fue utilizada");
  });

  it("confirms a valid custom price only for the owning entity", async () => {
    const supabase = createSupabaseStub({
      data: {
        action_type: "set_custom_price",
        payload: {
          entityType: "build",
          entityId: ownBuildFixture.id,
          slot: "cpu",
          currency: "EUR",
          price: 349.99,
        },
      },
      error: null,
    });
    const result = await confirmPendingAction({
      supabase: supabase as never,
      actor: { id: ownBuildFixture.user_id, isAnonymous: false },
    }, "action-1", "a".repeat(64));
    expect(result.message).toContain("349.99 EUR");
    expect(supabase.from).toHaveBeenCalledWith("created_builds");
    expect(supabase.builder.update).toHaveBeenCalledWith({ custom_price_cpu_eur: 349.99 });
  });

  it("does not confirm malformed price payloads", async () => {
    const supabase = createSupabaseStub({
      data: {
        action_type: "set_custom_price",
        payload: { entityType: "build", entityId: "build-1", slot: "not-a-slot", currency: "EUR", price: 20 },
      },
      error: null,
    });
    await expect(confirmPendingAction({
      supabase: supabase as never,
      actor: { id: "user-1", isAnonymous: false },
    }, "action-1", "a".repeat(64))).rejects.toThrow("propuesta de precio no es válida");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("marks a claimed action as failed when the vault write fails", async () => {
    const rpc = vi.fn(async (name: string) => name === "claim_ai_pending_action"
      ? {
          data: {
            action_type: "set_custom_price",
            payload: { entityType: "build", entityId: "build-1", slot: "cpu", currency: "USD", price: 20 },
          },
          error: null,
        }
      : { data: null, error: null });
    const builder = {
      update: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      then: <TResult>(resolve: (value: { data: null; error: { code: string; message: string } }) => TResult) => Promise.resolve(resolve({ data: null, error: { code: "write_failed", message: "temporary failure" } })),
    };
    const supabase = { rpc, from: vi.fn(() => builder) };

    await expect(confirmPendingAction({
      supabase: supabase as never,
      actor: { id: "user-1", isAnonymous: false },
    }, "action-1", "a".repeat(64))).rejects.toMatchObject({ code: "vault_price_update_failed" });
    expect(rpc).toHaveBeenCalledWith("fail_ai_pending_action", { p_action_id: "action-1" });
  });
});
