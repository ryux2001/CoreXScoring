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
    expect(completeChatTurn(completed, user, assistant, true)).toEqual([
      { role: "assistant", content: "Anterior\nRespuesta" },
    ]);
  });

  it("merges a continuation into the previous assistant message without repeating overlap", () => {
    const completed = [
      { role: "user" as const, content: "Pregunta" },
      { role: "assistant" as const, content: "La respuesta termina en una frase" },
    ];

    expect(completeChatTurn(completed, { role: "user", content: "" }, {
      role: "assistant",
      content: "una frase y continúa.",
    }, true)).toEqual([
      { role: "user", content: "Pregunta" },
      { role: "assistant", content: "La respuesta termina en una frase y continúa." },
    ]);
  });
});
