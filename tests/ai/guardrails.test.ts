import { describe, expect, it } from "vitest";
import { classifyChatIntent, evaluateChatGuardrails, HARDWARE_GUARDRAIL_VERSION } from "@/lib/ai/guardrails";
import { conversationCases } from "./cases/conversations";

describe("CoreX AI guardrails", () => {
  it("permite una conversación de hardware", () => {
    expect(classifyChatIntent(conversationCases.componentQuestion.messages)).toBe("hardware");
    expect(evaluateChatGuardrails(conversationCases.componentQuestion.messages).response).toBeUndefined();
  });

  it("rechaza localmente un tema fuera de alcance", () => {
    const decision = evaluateChatGuardrails(conversationCases.outOfScope.messages);
    expect(decision.intent).toBe("fuera_de_alcance");
    expect(decision.response?.provider).toBe("guardrail");
    expect(decision.response?.model).toBe(HARDWARE_GUARDRAIL_VERSION);
    expect(decision.response?.message.content).toContain("hardware");
  });

  it("rechaza intentos de revelar instrucciones internas", () => {
    const decision = evaluateChatGuardrails(conversationCases.promptInjection.messages);
    expect(decision.intent).toBe("riesgo");
    expect(decision.response?.message.content).toContain("No puedo revelar");
  });

  it("mantiene el contexto para una pregunta corta de seguimiento", () => {
    const messages = [
      { role: "user" as const, content: "Estoy comparando una RTX 5070 Ti" },
      { role: "assistant" as const, content: "Puedo ayudarte con la gráfica." },
      { role: "user" as const, content: "¿Y esta otra?" },
    ];
    expect(classifyChatIntent(messages)).toBe("hardware");
  });

  it("permite los accesos rápidos iniciales del chat", () => {
    const quickPrompts = [
      "¿Qué puedes hacer por mí?",
      "Quiero información de un componente",
      "Recomiéndame una build",
      "¿Qué es CoreXScoring?",
    ];

    for (const content of quickPrompts) {
      expect(evaluateChatGuardrails([{ role: "user", content }]).response).toBeUndefined();
    }
  });
});
