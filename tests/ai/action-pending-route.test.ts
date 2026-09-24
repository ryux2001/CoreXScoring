import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const getUser = vi.fn();
  const rpc = vi.fn();
  class MockActionExecutionError extends Error {
    constructor(
      readonly code: string,
      readonly databaseCode?: string,
      readonly databaseMessage?: string,
    ) {
      super("No se pudo guardar la entidad en la bóveda.");
    }
  }
  return {
    getUser,
    rpc,
    supabase: { auth: { getUser }, rpc },
    confirmPendingAction: vi.fn(),
    requireApiRateLimit: vi.fn(async () => null),
    MockActionExecutionError,
  };
});

vi.mock("@/lib/supabaseServer", () => ({
  createSupabaseServerClient: vi.fn(async () => mocks.supabase),
}));
vi.mock("@/lib/ai/actions", () => ({
  AiActionExecutionError: mocks.MockActionExecutionError,
  confirmPendingAction: mocks.confirmPendingAction,
}));
vi.mock("@/lib/api-security", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-security")>("@/lib/api-security");
  return {
    ...actual,
    requireApiRateLimit: mocks.requireApiRateLimit,
  };
});

import { GET, POST } from "@/app/api/ai/action/pending/route";

const actionId = "11111111-1111-4111-8111-111111111111";
const digest = "a".repeat(64);

function request(body?: unknown, origin = "http://localhost") {
  const serializedBody = body === undefined ? undefined : JSON.stringify(body);
  return new NextRequest("http://localhost/api/ai/action/pending", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin,
      ...(serializedBody ? { "Content-Length": String(new TextEncoder().encode(serializedBody).byteLength) } : {}),
    },
    ...(serializedBody === undefined ? {} : { body: serializedBody }),
  });
}

beforeEach(() => {
  mocks.getUser.mockReset();
  mocks.rpc.mockReset();
  mocks.confirmPendingAction.mockReset();
  mocks.requireApiRateLimit.mockReset().mockResolvedValue(null);
});

describe("pending action API", () => {
  it("rejects malformed confirmation input before touching the session", async () => {
    const response = await POST(request({ actionId, digest: "bad" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "invalid_action", retryable: false });
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("confirms an action without invoking the AI quota", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", is_anonymous: false } } });
    mocks.confirmPendingAction.mockResolvedValue({ message: "La build se guardó en tu bóveda." });

    const response = await POST(request({ actionId, digest }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ confirmed: true, message: "La build se guardó en tu bóveda." });
    expect(mocks.confirmPendingAction).toHaveBeenCalledWith(
      expect.objectContaining({ actor: { id: "user-1", isAnonymous: false } }),
      actionId,
      digest,
    );
    expect(mocks.requireApiRateLimit).toHaveBeenCalled();
  });

  it("returns a retryable structured error next to the action", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", is_anonymous: false } } });
    mocks.confirmPendingAction.mockRejectedValue(new mocks.MockActionExecutionError("vault_insert_failed", "42501", "permission denied"));

    const response = await POST(request({ actionId, digest }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "vault_insert_failed",
      error: "No se pudo guardar la entidad en la bóveda.",
      retryable: true,
    });
  });

  it("keeps the existing pending action listing contract", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", is_anonymous: false } } });
    mocks.rpc.mockResolvedValue({
      data: [{
        id: actionId,
        action_type: "create_build",
        payload_digest: digest,
        expires_at: "2030-01-01T00:00:00.000Z",
        summary: { entityTitle: "Mi build" },
      }],
      error: null,
    });

    const response = await GET(new NextRequest("http://localhost/api/ai/action/pending"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ actions: [{ id: actionId, type: "create_build", summary: { entityTitle: "Mi build" } }] });
  });
});
