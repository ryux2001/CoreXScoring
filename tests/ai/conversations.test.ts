import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdminClient: () => ({
    rpc: state.rpc,
  }),
}));

import { appendAiConversationAssistantMessage } from "@/lib/ai/conversations";

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
});
