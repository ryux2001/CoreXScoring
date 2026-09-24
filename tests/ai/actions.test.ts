import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmPendingAction } from "@/lib/ai/actions";
import { createSupabaseStub } from "./helpers/query-builder";
import { ownBuildFixture } from "./helpers/fixtures";

const actionSecret = "a".repeat(32);
function digest(payload: unknown): string {
  return createHmac("sha256", actionSecret).update(JSON.stringify(payload)).digest("hex");
}

afterEach(() => vi.unstubAllEnvs());

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
    vi.stubEnv("AI_ACTION_SECRET", actionSecret);
    const payload = {
      entityType: "build",
      entityId: ownBuildFixture.id,
      slot: "cpu",
      currency: "EUR",
      price: 349.99,
    };
    const supabase = createSupabaseStub({
      data: {
        action_type: "set_custom_price",
        payload,
      },
      error: null,
    });
    const result = await confirmPendingAction({
      supabase: supabase as never,
      actor: { id: ownBuildFixture.user_id, isAnonymous: false },
    }, "action-1", digest(payload));
    expect(result.message).toContain("349.99 EUR");
    expect(supabase.from).toHaveBeenCalledWith("created_builds");
    expect(supabase.builder.update).toHaveBeenCalledWith({ custom_price_cpu_eur: 349.99 });
  });

  it("accepts a JSON-serialized payload returned by the claim RPC", async () => {
    vi.stubEnv("AI_ACTION_SECRET", actionSecret);
    const payload = {
      entityType: "build",
      entityId: ownBuildFixture.id,
      slot: "cpu",
      currency: "EUR",
      price: 349.99,
    };
    const supabase = createSupabaseStub({
      data: {
        action_type: "set_custom_price",
        payload: JSON.stringify(payload),
      },
      error: null,
    });

    const result = await confirmPendingAction({
      supabase: supabase as never,
      actor: { id: ownBuildFixture.user_id, isAnonymous: false },
    }, "action-1", digest(payload));

    expect(result.message).toContain("349.99 EUR");
    expect(supabase.builder.update).toHaveBeenCalledWith({ custom_price_cpu_eur: 349.99 });
  });

  it("does not reject a valid digest when JSONB reorders payload keys", async () => {
    vi.stubEnv("AI_ACTION_SECRET", actionSecret);
    const originalPayload = {
      entityType: "build",
      entityId: ownBuildFixture.id,
      slot: "cpu",
      currency: "EUR",
      price: 349.99,
    };
    const reorderedPayload = {
      price: originalPayload.price,
      currency: originalPayload.currency,
      slot: originalPayload.slot,
      entityId: originalPayload.entityId,
      entityType: originalPayload.entityType,
    };
    const supabase = createSupabaseStub({
      data: { action_type: "set_custom_price", payload: reorderedPayload },
      error: null,
    });

    const result = await confirmPendingAction({
      supabase: supabase as never,
      actor: { id: ownBuildFixture.user_id, isAnonymous: false },
    }, "action-1", digest(originalPayload));

    expect(result.message).toContain("349.99 EUR");
  });

  it("does not confirm malformed price payloads", async () => {
    vi.stubEnv("AI_ACTION_SECRET", actionSecret);
    const payload = { entityType: "build", entityId: "build-1", slot: "not-a-slot", currency: "EUR", price: 20 };
    const supabase = createSupabaseStub({
      data: {
        action_type: "set_custom_price",
        payload,
      },
      error: null,
    });
    await expect(confirmPendingAction({
      supabase: supabase as never,
      actor: { id: "user-1", isAnonymous: false },
    }, "action-1", digest(payload))).rejects.toThrow("propuesta de precio no es válida");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("marks a malformed claimed payload as failed and keeps it retryable", async () => {
    const rpc = vi.fn(async (name: string) => name === "claim_ai_pending_action"
      ? { data: { action_type: "create_build", payload: "not-json" }, error: null }
      : { data: null, error: null });
    const supabase = { rpc, from: vi.fn() };

    await expect(confirmPendingAction({
      supabase: supabase as never,
      actor: { id: "user-1", isAnonymous: false },
    }, "action-1", "a".repeat(64))).rejects.toThrow("propuesta de acción no es válida");
    expect(rpc).toHaveBeenCalledWith("fail_ai_pending_action", { p_action_id: "action-1" });
  });

  it("marks a claimed action as failed when the vault write fails", async () => {
    vi.stubEnv("AI_ACTION_SECRET", actionSecret);
    const payload = { entityType: "build", entityId: "build-1", slot: "cpu", currency: "USD", price: 20 };
    const rpc = vi.fn(async (name: string) => name === "claim_ai_pending_action"
      ? {
          data: {
            action_type: "set_custom_price",
            payload,
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
    }, "action-1", digest(payload))).rejects.toMatchObject({ code: "vault_price_update_failed" });
    expect(rpc).toHaveBeenCalledWith("fail_ai_pending_action", { p_action_id: "action-1" });
  });

  it("does not insert a second build when a claimed action already created it", async () => {
    vi.stubEnv("AI_ACTION_SECRET", actionSecret);
    const payload = {
      title: "Build idempotente",
      category: "Personalizada",
      componentIds: {
        cpu: "cpu-1",
        gpu: "gpu-1",
        ram: "ram-1",
        motherboard: "board-1",
        storage: "storage-1",
        psu: "psu-1",
      },
      customPrices: {},
    };
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      maybeSingle: vi.fn(async () => ({ data: { id: "created-1", title: payload.title }, error: null })),
      insert: vi.fn(() => builder),
      then: <TResult>(resolve: (value: { data: null; error: null }) => TResult) => Promise.resolve(resolve({ data: null, error: null })),
    };
    const rpc = vi.fn(async (name: string) => name === "claim_ai_pending_action"
      ? { data: { action_type: "create_build", payload }, error: null }
      : { data: null, error: null });
    const supabase = { rpc, from: vi.fn(() => builder) };

    const result = await confirmPendingAction({
      supabase: supabase as never,
      actor: { id: "user-1", isAnonymous: false },
    }, "action-1", digest(payload));

    expect(result.message).toContain("Build idempotente");
    expect(builder.insert).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("finalize_ai_pending_action", { p_action_id: "action-1" });
  });

  it("surfaces finalization failures and marks the action retryable", async () => {
    vi.stubEnv("AI_ACTION_SECRET", actionSecret);
    const payload = { entityType: "build", entityId: "build-1", slot: "cpu", currency: "USD", price: 20 };
    const rpc = vi.fn(async (name: string) => {
      if (name === "claim_ai_pending_action") return { data: { action_type: "set_custom_price", payload }, error: null };
      if (name === "finalize_ai_pending_action") return { data: null, error: { code: "finalize_failed", message: "temporary failure" } };
      return { data: null, error: null };
    });
    const builder = {
      update: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      then: <TResult>(resolve: (value: { data: null; error: null }) => TResult) => Promise.resolve(resolve({ data: null, error: null })),
    };
    const supabase = { rpc, from: vi.fn(() => builder) };

    await expect(confirmPendingAction({
      supabase: supabase as never,
      actor: { id: "user-1", isAnonymous: false },
    }, "action-1", digest(payload))).rejects.toMatchObject({ code: "pending_action_finalize_failed" });
    expect(rpc).toHaveBeenCalledWith("fail_ai_pending_action", { p_action_id: "action-1" });
  });
});
