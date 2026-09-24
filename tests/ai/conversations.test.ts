import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdminClient: () => ({
    rpc: state.rpc,
  }),
}));

import { appendAiConversationAssistantMessage, appendAiConversationTurn } from "@/lib/ai/conversations";
import { mergeRecommendationState } from "@/lib/ai/recommendation-state";

describe("AI conversation persistence", () => {
  afterEach(() => {
    state.rpc.mockReset();
    state.rpc.mockResolvedValue({ error: null });
  });

  it("persists a continuation as an assistant-only message", async () => {
    state.rpc.mockResolvedValue({ error: null });

    await appendAiConversationAssistantMessage({
      userId: "user-1",
      conversationId: "conversation-1",
      assistantMessage: { role: "assistant", content: "La explicación continúa aquí." },
    });

    expect(state.rpc).toHaveBeenCalledWith("append_ai_conversation_assistant_message", {
      p_user_id: "user-1",
      p_conversation_id: "conversation-1",
      p_assistant_content: "La explicación continúa aquí.",
      p_state: { version: 1 },
    });
  });

  it("persists structured recommendation state as version 2", async () => {
    state.rpc.mockResolvedValue({ data: "conversation-1", error: null });
    const recommendationState = mergeRecommendationState(undefined, "build", { criteria: { useCase: "gaming" } });

    await appendAiConversationTurn({
      userId: "user-1",
      userMessage: { role: "user", content: "Juegos AAA" },
      assistantMessage: { role: "assistant", content: "¿Cuál es tu presupuesto?" },
      recommendationState,
    });

    expect(state.rpc).toHaveBeenCalledWith("append_ai_conversation_turn", expect.objectContaining({
      p_state: expect.objectContaining({ version: 2, recommendationState }),
    }));
  });
});
