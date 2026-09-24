import { afterEach, describe, expect, it, vi } from "vitest";
import { getServerToolCapabilities, runChat } from "@/lib/ai/gateway";
import { AI_TOOL_DEFINITIONS } from "@/lib/ai/tools";
import { createQueryBuilder, createSupabaseStub } from "./helpers/query-builder";
import { cpuFixture, gameFixture, gpuFixture } from "./helpers/fixtures";
import { mergeRecommendationState } from "@/lib/ai/recommendation-state";

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

  it("does not expose removed external price-search tools", () => {
    expect(AI_TOOL_DEFINITIONS.some((tool) => /price|search/i.test(tool.function.name) && tool.function.name.includes("external"))).toBe(false);
    expect(AI_TOOL_DEFINITIONS.some((tool) => tool.function.name === "find_external_price")).toBe(false);
  });

  it("exposes private search and custom-price proposal tools for an explicit vault price change", () => {
    const capabilities = getServerToolCapabilities([
      { role: "user", content: "Cambia el precio de mi build Gaming a 1200 EUR" },
    ], {
      actor: { id: "user-1", isAnonymous: false },
    });

    expect(capabilities).toEqual(expect.arrayContaining([
      "search_user_builds",
      "search_user_combos",
      "propose_set_custom_price",
    ]));
  });

  it("does not expose custom vault price mutation to anonymous users", () => {
    const capabilities = getServerToolCapabilities([
      { role: "user", content: "Cambia el precio de mi build Gaming a 1200 EUR" },
    ], {
      actor: { id: "anonymous", isAnonymous: true },
    });

    expect(capabilities).not.toContain("propose_set_custom_price");
    expect(capabilities).not.toContain("search_user_builds");
  });

  it("keeps the build recommendation state updater available when the user answers its criteria", () => {
    const messages = [
      { role: "user" as const, content: "Recomiéndame una build para gaming" },
      { role: "assistant" as const, content: "Dime tu presupuesto y resolución objetivo." },
      { role: "user" as const, content: "700, 1080p, AAA, calidad precio" },
    ];

    expect(getServerToolCapabilities(messages, { actor: { id: "user-1", isAnonymous: false } })).toContain("update_build_recommendation_state");
  });

  it("keeps only the combo recommendation updater available when the user answers its criteria", () => {
    const messages = [
      { role: "user" as const, content: "Recomiéndame un combo para gaming" },
      { role: "assistant" as const, content: "Dime tu presupuesto y resolución objetivo." },
      { role: "user" as const, content: "800 USD, 1080p, calidad precio, mercado nuevo" },
    ];

    expect(getServerToolCapabilities(messages, { actor: { id: "user-1", isAnonymous: false } })).toContain("update_combo_recommendation_state");
  });

  it("finishes a comparator FPS request without reopening the general tool loop", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    const productBuilder = createQueryBuilder({ data: [gpuFixture], error: null });
    const gameBuilder = createQueryBuilder({ data: gameFixture, error: null });
    const supabase = {
      from: vi.fn((table: string) => table === "games" ? gameBuilder : productBuilder),
    };
    const fetchMock = vi.fn(async () => providerResponse({
      model: "Qwen3.5-9B-UD-Q4_K_XL",
      choices: [{
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{
            id: "fps-call",
            type: "function",
            function: {
              name: "get_game_fps",
              arguments: JSON.stringify({ gameSlug: gameFixture.slug, resolution: "4k", preset: "ultra" }),
            },
          }],
        },
      }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runChat([
      { role: "user", content: "Cual saca mas FPS en 4K en Cyberpunk 2077?" },
    ], {
      supabase: supabase as never,
      actor: { id: "user-1", isAnonymous: false },
      pageContext: {
        pathname: "/comparator",
        route: "comparator",
        comparison: {
          itemIds: [gpuFixture.id],
          items: [{ id: gpuFixture.id, entityType: "product" }],
        },
      },
    }, "gateway-comparator-fps");

    expect(result.message.content).toContain("Cyberpunk 2077");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    const request = JSON.parse(String(init.body));
    expect(request.tools.map((tool: { function: { name: string } }) => tool.function.name)).toEqual(["get_game_fps"]);
  });

  it("keeps a complete criteria answer on the recommendation tool path", () => {
    const messages = [
      { role: "user" as const, content: "Recomiéndame una build" },
      { role: "assistant" as const, content: "Presupuesto total, uso principal, resolución y prioridad." },
      { role: "user" as const, content: "900 Gaming 1080p Valor No tengo preferencia en FPS específicos Mercado nuevo" },
    ];

    expect(getServerToolCapabilities(messages, { actor: { id: "user-1", isAnonymous: false } })).toContain("update_build_recommendation_state");
  });

  it("recovers a recommendation when the local model emits analyze_build", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    const fetchMock = vi.fn(async () => providerResponse({
      model: "Qwen3.5-9B-UD-Q4_K_XL",
      choices: [{
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{
            id: "wrong-tool",
            type: "function",
            function: { name: "analyze_build", arguments: "{}" },
          }],
        },
      }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runChat([
      { role: "user", content: "Recomiéndame una build" },
      { role: "assistant", content: "Presupuesto total, uso principal, resolución y prioridad." },
      { role: "user", content: "900 Gaming 1080p Valor No tengo preferencia en FPS específicos Mercado nuevo" },
    ], toolContext(), "gateway-recommendation-recovery");

    expect(result.message.content).toContain("No pude preparar");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recovers a combo recommendation when the local model emits analyze_build", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    const fetchMock = vi.fn(async () => providerResponse({
      model: "Qwen3.5-9B-UD-Q4_K_XL",
      choices: [{
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{
            id: "wrong-tool",
            type: "function",
            function: { name: "analyze_build", arguments: "{}" },
          }],
        },
      }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runChat([
      { role: "user", content: "Recomiéndame un combo para gaming" },
      { role: "assistant", content: "Presupuesto total, uso principal, resolución y prioridad." },
      { role: "user", content: "800 USD Gaming 1080p Valor Mercado nuevo" },
    ], toolContext(), "gateway-combo-recommendation-recovery");

    expect(result.message.content).toMatch(/prepare|preparar/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    const request = JSON.parse(String(init.body));
    expect(request.tools.map((tool: { function: { name: string } }) => tool.function.name)).toEqual(["update_combo_recommendation_state"]);
    expect(request.tool_choice).toEqual({ type: "function", function: { name: "update_combo_recommendation_state" } });
  });

  it("keeps a multi-turn combo recommendation structured when state was not created earlier", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    const fetchMock = vi.fn(async () => providerResponse({
      model: "Qwen3.5-9B-UD-Q4_K_XL",
      choices: [{
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{
            id: "wrong-tool",
            type: "function",
            function: { name: "search_components", arguments: "{}" },
          }],
        },
      }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runChat([
      { role: "user", content: "Recomiendame un combo" },
      { role: "assistant", content: "Presupuesto y uso principal?" },
      { role: "user", content: "800$" },
      { role: "assistant", content: "¿Qué resolución y mercado prefieres?" },
      { role: "user", content: "Mercado nuevo, gaming 1440p, sin fps objetivos especificos" },
    ], toolContext(), "gateway-combo-multi-turn-recovery");

    expect(result.message.content).toMatch(/prepare|preparar/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    const request = JSON.parse(String(init.body));
    expect(request.tools.map((tool: { function: { name: string } }) => tool.function.name)).toEqual(["update_combo_recommendation_state"]);
    expect(request.tool_choice).toEqual({ type: "function", function: { name: "update_combo_recommendation_state" } });
  });

  it("makes the build recommendation state updater available before the user answers clarifying questions", () => {
    expect(getServerToolCapabilities([
      { role: "user", content: "Recomiéndame una build para gaming" },
    ], { actor: { id: "user-1", isAnonymous: false } })).toContain("update_build_recommendation_state");
  });

  it("keeps an active recommendation hardware-scoped after an intermediate greeting", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    const state = mergeRecommendationState(undefined, "build", { criteria: { useCase: "gaming" } });
    const fetchMock = vi.fn(async () => providerResponse({
      choices: [{ message: { role: "assistant", content: "¿Cuál es tu presupuesto total?" } }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    await runChat([{ role: "user", content: "Hola" }], { ...toolContext(), recommendationState: state }, "gateway-active-state");

    const [, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    const request = JSON.parse(String(init.body));
    expect(request.tools.map((tool: { function: { name: string } }) => tool.function.name)).toEqual(["update_build_recommendation_state"]);
    expect(request.tool_choice).toEqual({ type: "function", function: { name: "update_build_recommendation_state" } });
  });

  it("exposes only structured recommendation tools for an incomplete build recommendation", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    const fetchMock = vi.fn(async () => providerResponse({
      model: "Qwen3.5-9B-UD-Q4_K_XL",
      choices: [{ message: { role: "assistant", content: "¿Qué presupuesto y resolución tienes?" } }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    await runChat([
      { role: "user", content: "Recomiéndame una build para gaming" },
    ], toolContext(), "gateway-build-clarification");

    const [, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    const request = JSON.parse(String(init.body));
    expect(request.tools.map((tool: { function: { name: string } }) => tool.function.name)).toEqual(["update_build_recommendation_state"]);
    expect(request.tool_choice).toEqual({ type: "function", function: { name: "update_build_recommendation_state" } });
  });

  it("routes a complete one-message recommendation through the state updater", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    const fetchMock = vi.fn(async () => providerResponse({
      model: "Qwen3.5-9B-UD-Q4_K_XL",
      choices: [{ message: { role: "assistant", content: "He preparado una recomendación." } }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    expect(getServerToolCapabilities([
      { role: "user", content: "Recomiéndame una build gaming de 700 USD para 1080p AAA con buena calidad precio" },
    ], { actor: { id: "user-1", isAnonymous: false } })).toContain("update_build_recommendation_state");

    await runChat([
      { role: "user", content: "Recomiéndame una build gaming de 700 USD para 1080p AAA con buena calidad precio" },
    ], toolContext(), "gateway-build-complete");

    const [, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    const request = JSON.parse(String(init.body));
    expect(request.tools.map((tool: { function: { name: string } }) => tool.function.name)).toEqual(["update_build_recommendation_state"]);
    expect(request.tool_choice).toEqual({ type: "function", function: { name: "update_build_recommendation_state" } });
  });

  it("executes the private search before preparing a custom-price proposal", async () => {
    vi.stubEnv("AI_ACTION_SECRET", "a".repeat(32));
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    vi.stubEnv("AI_LOCAL_BASE_URL", "http://127.0.0.1:8080/v1");
    const supabase = createSupabaseStub({
      data: [{ id: "build-1", title: "Gaming", slug: "gaming", category: "Personalizada", created_at: "2026-09-21T00:00:00Z", cpu_id: "cpu-1", gpu_id: "gpu-1", ram_id: "ram-1", motherboard_id: "board-1", storage_id: "storage-1", psu_id: "psu-1" }],
      error: null,
    });
    const actionSupabase = {
      ...supabase,
      rpc: vi.fn(async () => ({ data: { id: "action-1" }, error: null })),
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(providerResponse({ choices: [{ message: { content: null, tool_calls: [{ id: "call-search", type: "function", function: { name: "search_user_builds", arguments: JSON.stringify({ query: "Gaming" }) } }] } }] }))
      .mockResolvedValueOnce(providerResponse({ choices: [{ message: { content: null, tool_calls: [{ id: "call-price", type: "function", function: { name: "propose_set_custom_price", arguments: JSON.stringify({ entityType: "build", entityId: "build-1", slot: "cpu", currency: "EUR", price: 999 }) } }] } }] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runChat([
      { role: "user", content: "Cambia el precio de mi build Gaming a 999 EUR" },
    ], {
      supabase: supabase as never,
      actionSupabase: actionSupabase as never,
      requestId: "11111111-1111-4111-8111-111111111111",
      actor: { id: "user-1", isAnonymous: false },
    });

    expect(result.pendingAction).toMatchObject({ id: "action-1", type: "set_custom_price" });
    expect(actionSupabase.rpc).toHaveBeenCalledWith("create_ai_pending_action_server_v2", expect.objectContaining({ p_summary: expect.objectContaining({ entityType: "build", price: 999 }) }));
  });

  it("returns a normal response from the local provider", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    vi.stubEnv("AI_LOCAL_BASE_URL", "http://127.0.0.1:8080/v1");
    vi.stubEnv("AI_LOCAL_MODEL", "Qwen3.5-9B-UD-Q4_K_XL");
    const fetchMock = vi.fn(async () => providerResponse({
      model: "Qwen3.5-9B-UD-Q4_K_XL",
      choices: [{ message: { role: "assistant", content: "Una GPU procesa gráficos y una CPU coordina tareas generales." } }],
      usage: { prompt_tokens: 30, completion_tokens: 16 },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runChat([
      { role: "user", content: "¿Qué diferencia hay entre una CPU y una GPU?" },
    ], toolContext(), "gateway-normal");

    expect(result.provider).toBe("local");
    expect(result.model).toBe("Qwen3.5-9B-UD-Q4_K_XL");
    expect(result.message.content).toContain("GPU");
    expect(result.usage).toEqual({ inputTokens: 30, outputTokens: 16 });

    const [, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    const request = JSON.parse(String(init.body));
    expect(request.max_tokens).toBe(1_600);
    expect(request.tool_choice).toBe("auto");
  });

  it("asks for a title when the user proceeds with a planned build", async () => {
    const draft = {
      currency: "USD",
      components: Object.fromEntries(["cpu", "gpu", "ram", "motherboard", "storage", "psu"].map((slot) => [slot, {
        id: `${slot}-1`,
        name: `${slot} component`,
        type: slot,
        query: `${slot} component`,
        priceMode: "catalog",
      }])),
    };

    const result = await runChat([
      { role: "user", content: "Sí, procede con esta build" },
    ], { ...toolContext(), buildDraft: draft as never }, "gateway-proceed-build");

    expect(result.provider).toBe("guardrail");
    expect(result.message.content).toMatch(/título|title/i);
    expect(result.buildDraft?.awaitingTitle).toBe(true);
    expect(result.buildDraft?.saveState).toBe("awaiting_title");
  });

  it("treats approval language as proceeding with a planned build", async () => {
    const draft = {
      currency: "USD",
      components: Object.fromEntries(["cpu", "gpu", "ram", "motherboard", "storage", "psu"].map((slot) => [slot, {
        id: `${slot}-1`,
        name: `${slot} component`,
        type: slot,
        query: `${slot} component`,
        priceMode: "catalog",
      }])),
    };

    const result = await runChat([
      { role: "user", content: "Perfecto, me gusta esa build" },
    ], { ...toolContext(), buildDraft: draft as never }, "gateway-approve-build");

    expect(result.provider).toBe("guardrail");
    expect(result.message.content).toMatch(/título|title/i);
    expect(result.buildDraft?.awaitingTitle).toBe(true);
  });

  it("completes title and save confirmation without calling the provider", async () => {
    vi.stubEnv("AI_ACTION_SECRET", "a".repeat(32));
    const slots = ["cpu", "gpu", "ram", "motherboard", "storage", "psu"] as const;
    const rows = slots.map((slot) => ({ id: `${slot}-1`, name: `${slot} catalog component`, type: slot }));
    const builder = createQueryBuilder({ data: rows, error: null }, (ids) => ({ data: rows.filter((row) => ids.includes(row.id)), error: null }));
    const supabase = { from: vi.fn(() => builder), rpc: vi.fn(async () => ({ data: { id: "unused" }, error: null })) };
    const actionSupabase = createSupabaseStub({ data: { id: "pending-build-1" }, error: null });
    const draft = {
      currency: "USD",
      saveState: "awaiting_title",
      awaitingTitle: true,
      components: Object.fromEntries(slots.map((slot) => [slot, {
        id: `${slot}-1`,
        name: `${slot} client component`,
        type: slot,
        query: `${slot} component`,
        priceMode: "catalog",
      }])),
    };
    const context = {
      supabase,
      actionSupabase,
      requestId: "11111111-1111-4111-8111-111111111111",
      actor: { id: "user-1", isAnonymous: false },
    };

    const titled = await runChat([{ role: "user", content: "1080p con Intel" }], { ...context, buildDraft: draft as never } as never, "gateway-title-transition");
    expect(titled.provider).toBe("guardrail");
    expect(titled.pendingAction).toBeUndefined();
    expect(titled.buildDraft).toMatchObject({ title: "1080p con Intel", saveState: "awaiting_save_confirmation" });

    const confirmed = await runChat([{ role: "user", content: "Sí, guardamos" }], { ...context, buildDraft: titled.buildDraft } as never, "gateway-save-transition");
    expect(confirmed.provider).toBe("guardrail");
    expect(confirmed.pendingAction).toMatchObject({ id: "pending-build-1", type: "create_build" });
    expect(actionSupabase.rpc).toHaveBeenCalledTimes(1);
  });

  it("keeps continuation instructions internal and disables tools", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    vi.stubEnv("AI_LOCAL_BASE_URL", "http://127.0.0.1:8080/v1");
    vi.stubEnv("AI_LOCAL_MODEL", "Qwen3.5-9B-UD-Q4_K_XL");
    const fetchMock = vi.fn(async () => providerResponse({
      model: "Qwen3.5-9B-UD-Q4_K_XL",
      choices: [{ message: { role: "assistant", content: "La continuación sigue aquí." } }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    await runChat([
      { role: "user", content: "Explica esta GPU." },
      { role: "assistant", content: "La respuesta quedó incompleta." },
    ], { ...toolContext(), allowedTools: [] }, "gateway-continuation", undefined, undefined, undefined, undefined, "Continue from the interruption without repeating content.");

    const [, init] = (fetchMock.mock.calls[0] || []) as unknown as [RequestInfo | URL, RequestInit];
    const request = JSON.parse(String(init.body));
    expect(request.tools).toEqual([]);
    expect(request.messages[0].content).toContain("Continue from the interruption");
    expect(request.messages.slice(1).some((message: { content: string }) => message.content.includes("Continue from the interruption"))).toBe(false);
  });

  it("sends an opaque cache session only to OpenRouter and records cache usage", async () => {
    vi.stubEnv("AI_MANAGED_PROVIDERS", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("AI_OPENROUTER_MODELS", "qwen/qwen3.7-flash");
    const fetchMock = vi.fn(async () => providerResponse({
      model: "qwen/qwen3.7-flash",
      choices: [{ message: { role: "assistant", content: "La RAM almacena datos temporales para la CPU." } }],
      usage: {
        prompt_tokens: 1_000,
        completion_tokens: 20,
        prompt_tokens_details: { cached_tokens: 700, cache_write_tokens: 100 },
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runChat([
      { role: "user", content: "¿Qué hace la RAM?" },
    ], toolContext(), "gateway-cache", undefined, undefined, undefined, "550e8400-e29b-41d4-a716-446655440000");

    const [, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    const request = JSON.parse(String(init.body));
    expect(request.session_id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.usage).toEqual({ inputTokens: 1_000, outputTokens: 20, cachedInputTokens: 700, cacheWriteTokens: 100 });
  });

  it("falls back from the free router to Qwen while retaining the cache session", async () => {
    vi.stubEnv("AI_MANAGED_PROVIDERS", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("AI_OPENROUTER_MODELS", "openrouter/free,qwen/qwen3.7-flash");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(providerResponse({ error: { code: "rate_limit_exceeded" } }, 429))
      .mockResolvedValueOnce(providerResponse({
        model: "qwen/qwen3.7-flash",
        choices: [{ message: { role: "assistant", content: "Una fuente de alimentación estable protege los componentes." } }],
        usage: { prompt_tokens: 90, completion_tokens: 18 },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runChat([
      { role: "user", content: "¿Para qué sirve la fuente de alimentación?" },
    ], toolContext(), "gateway-free-fallback", undefined, undefined, undefined, "550e8400-e29b-41d4-a716-446655440001");

    expect(result.model).toBe("qwen/qwen3.7-flash");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, freeInit] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    const [, qwenInit] = fetchMock.mock.calls[1] as unknown as [RequestInfo | URL, RequestInit];
    const freeRequest = JSON.parse(String(freeInit.body));
    const qwenRequest = JSON.parse(String(qwenInit.body));
    expect(freeRequest).toMatchObject({ model: "openrouter/free", session_id: "550e8400-e29b-41d4-a716-446655440001" });
    expect(qwenRequest).toMatchObject({ model: "qwen/qwen3.7-flash", session_id: "550e8400-e29b-41d4-a716-446655440001" });
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

  it("returns one atomic comparison snapshot for several additions with prices", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    const secondCpu = { ...cpuFixture, id: "cpu-5600", name: "AMD Ryzen 5 5600" };
    const productBuilder = createQueryBuilder({ data: [cpuFixture, secondCpu], error: null });
    const supabase = { from: vi.fn(() => productBuilder) };
    const fetchMock = vi.fn(async () => providerResponse({
      choices: [{
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{
            id: "call-comparison-batch-1",
            type: "function",
            function: {
              name: "propose_update_comparison",
              arguments: JSON.stringify({
                mode: "patch",
                additions: [{ id: cpuFixture.id, price: 170 }, { id: secondCpu.id, price: 95 }],
                currency: "USD",
              }),
            },
          }],
        },
      }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runChat([
      { role: "user", content: "Añade el Ryzen 7 7800X3D a 170$ y el Ryzen 5 5600 a 95$." },
    ], {
      supabase: supabase as never,
      actor: { id: "user-1", isAnonymous: false },
      pageContext: { pathname: "/comparator", search: "?currency=USD", route: "comparator", comparison: { itemIds: [] } },
    }, "gateway-comparison-batch");

    expect(result.comparisonAction).toMatchObject({
      type: "replace",
      items: [{ id: cpuFixture.id }, { id: secondCpu.id }],
      evaluatedPrices: { [cpuFixture.id]: 170, [secondCpu.id]: 95 },
    });
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

  it("rejects more than three tool calls in one provider round", async () => {
    vi.stubEnv("AI_LOCAL_ENABLED", "true");
    vi.stubEnv("AI_LOCAL_ONLY", "true");
    vi.stubGlobal("fetch", vi.fn(async () => providerResponse({
      choices: [{
        message: {
          role: "assistant",
          content: null,
          tool_calls: ["search_components", "get_component", "get_game_fps", "compare_components"].map((name, index) => ({
            id: `call-${index}`,
            type: "function",
            function: { name, arguments: "{}" },
          })),
        },
      }],
    })));

    await expect(runChat([
      { role: "user", content: "Busca y compara componentes." },
    ], toolContext(), "gateway-tool-cap")).rejects.toMatchObject({
      code: "tool_round_limit",
      stage: "tool_loop",
    });
  });
});
