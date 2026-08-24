import { afterEach, describe, expect, it, vi } from "vitest";
import { runChat } from "@/lib/ai/gateway";
import { createQueryBuilder, createSupabaseStub } from "./helpers/query-builder";
import { cpuFixture } from "./helpers/fixtures";

function providerResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toolContext() {
  return {
    supabase: createSupabaseStub({ data: [cpuFixture], error: null }) as never,
    actor: { id: "user-1", isAnonymous: false },
    pageContext: { pathname: "/catalog", route: "catalog" as const },
  };
}

describe("AI gateway conversational protocol", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns a normal response from the local provider", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    vi.stubEnv("AI_LOCAL_BASE_URL", "http://127.0.0.1:8080/v1");
    vi.stubEnv("AI_LOCAL_MODEL", "Qwen3.5-9B-UD-Q4_K_XL");
    vi.stubGlobal("fetch", vi.fn(async () => providerResponse({
      model: "Qwen3.5-9B-UD-Q4_K_XL",
      choices: [{ message: { role: "assistant", content: "Una GPU procesa gráficos y una CPU coordina tareas generales." } }],
      usage: { prompt_tokens: 30, completion_tokens: 16 },
    })));

    const result = await runChat([
      { role: "user", content: "¿Qué diferencia hay entre una CPU y una GPU?" },
    ], toolContext(), "gateway-normal");

    expect(result.provider).toBe("local");
    expect(result.model).toBe("Qwen3.5-9B-UD-Q4_K_XL");
    expect(result.message.content).toContain("GPU");
    expect(result.usage).toEqual({ inputTokens: 30, outputTokens: 16 });
  });

  it("executes a structured catalog tool call and then returns the final answer", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(providerResponse({
        choices: [{
          message: {
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "call-search-1",
              type: "function",
              function: { name: "search_components", arguments: JSON.stringify({ query: "7800X3D", type: "cpu", limit: 1 }) },
            }],
          },
        }],
        usage: { prompt_tokens: 80, completion_tokens: 20 },
      }))
      .mockResolvedValueOnce(providerResponse({
        choices: [{ message: { role: "assistant", content: "He encontrado el Ryzen 7 7800X3D en el catálogo interno." } }],
        usage: { prompt_tokens: 160, completion_tokens: 14 },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runChat([
      { role: "user", content: "Busca el Ryzen 7 7800X3D en el catálogo." },
    ], toolContext(), "gateway-tool");

    expect(result.provider).toBe("local");
    expect(result.toolCalls).toBe(1);
    expect(result.message.content).toContain("7800X3D");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondRequest = JSON.parse(String(fetchMock.mock.calls[1]?.[0] && (fetchMock.mock.calls[1]?.[1] as RequestInit).body));
    expect(secondRequest.messages.some((message: { role: string; tool_call_id?: string }) => message.role === "tool" && message.tool_call_id === "call-search-1")).toBe(true);
  });

  it("returns a structured local action for an explicit comparison add request", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    const secondCpu = { ...cpuFixture, id: "cpu-7700x3d", name: "AMD Ryzen 7 7700X3D" };
    const currentBuilder = createQueryBuilder({ data: [cpuFixture], error: null });
    const productBuilder = createQueryBuilder({ data: secondCpu, error: null });
    const supabase = {
      from: vi.fn((table: string) => table === "products" ? currentBuilder : productBuilder),
    };
    const fetchMock = vi.fn(async () => providerResponse({
      choices: [{
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{
            id: "call-add-1",
            type: "function",
            function: { name: "propose_add_to_comparison", arguments: JSON.stringify({ id: secondCpu.id }) },
          }],
        },
      }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runChat([
      { role: "user", content: "Añade el Ryzen 7 7700X3D a la comparación." },
    ], {
      supabase: supabase as never,
      actor: { id: "user-1", isAnonymous: false },
      pageContext: {
        pathname: "/comparator",
        route: "comparator",
        comparison: { itemIds: [cpuFixture.id] },
      },
    }, "gateway-comparison-add");

    expect(result.comparisonAction).toMatchObject({ type: "add", itemId: secondCpu.id });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("routes an explicit comparison price request to the local price action", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    const productBuilder = createQueryBuilder({ data: cpuFixture, error: null });
    const supabase = { from: vi.fn(() => productBuilder) };
    const fetchMock = vi.fn(async () => providerResponse({
      choices: [{
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{
            id: "call-price-1",
            type: "function",
            function: { name: "propose_set_comparison_price", arguments: JSON.stringify({ id: cpuFixture.id, price: 200, currency: "USD" }) },
          }],
        },
      }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runChat([
      { role: "user", content: "Coloca el Ryzen 5 5600 a 200$." },
    ], {
      supabase: supabase as never,
      actor: { id: "user-1", isAnonymous: false },
      pageContext: {
        pathname: "/comparator",
        search: "?currency=USD",
        route: "comparator",
        comparison: { itemIds: [cpuFixture.id] },
      },
    }, "gateway-comparison-price");

    expect(result.comparisonAction).toMatchObject({ type: "set_price", itemId: cpuFixture.id, price: 200, currency: "USD" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a provider response that describes a tool instead of using tool_calls", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    vi.stubGlobal("fetch", vi.fn(async () => providerResponse({
      choices: [{ message: { role: "assistant", content: "I need to call search_components with the product id first." } }],
    })));

    await expect(runChat([
      { role: "user", content: "Busca una RTX 5070" },
    ], toolContext(), "gateway-leaked-plan")).rejects.toMatchObject({
      code: "unstructured_tool_plan",
      stage: "response",
    });
  });

  it("fails closed when local-only mode has no local provider", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "false");
    vi.stubEnv("AI_LOCAL_ONLY", "true");

    await expect(runChat([
      { role: "user", content: "Explícame qué es la memoria RAM" },
    ], toolContext(), "gateway-no-provider")).rejects.toMatchObject({
      code: "no_provider_candidates",
      stage: "configuration",
    });
  });
});
