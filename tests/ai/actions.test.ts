import { describe, expect, it } from "vitest";
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
});
