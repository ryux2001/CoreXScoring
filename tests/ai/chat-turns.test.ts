import { describe, expect, it } from "vitest";
import { completeChatTurn, getChatRequestMessages } from "@/lib/ai/chat-turns";

describe("chat turn lifecycle", () => {
  it("does not include an uncommitted failed turn in a new request", () => {
    const completed = [{ role: "assistant" as const, content: "Respuesta anterior" }];
    const failed = { role: "user" as const, content: "Este turno falló" };
    const request = getChatRequestMessages(completed, { role: "user", content: "Nuevo mensaje" });

    expect(request).toEqual([...completed, { role: "user", content: "Nuevo mensaje" }]);
    expect(request).not.toContainEqual(failed);
  });

  it("adds the user turn only after the request completes", () => {
    const completed = [{ role: "assistant" as const, content: "Anterior" }];
    const user = { role: "user" as const, content: "Pregunta" };
    const assistant = { role: "assistant" as const, content: "Respuesta" };

    expect(completeChatTurn(completed, user, assistant)).toEqual([...completed, user, assistant]);
    expect(completeChatTurn(completed, user, assistant, true)).toEqual([...completed, assistant]);
  });
});
