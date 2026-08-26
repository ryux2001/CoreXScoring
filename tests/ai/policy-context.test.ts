import { describe, expect, it } from "vitest";
import { resolveAiPolicyContext, selectAiPolicyFiles } from "@/lib/ai/context/policies";

describe("AI recommendation policy context", () => {
  it("loads only the base and GPU policies for a GPU recommendation", () => {
    const files = selectAiPolicyFiles([{ role: "user", content: "¿Merece la pena una RTX 3050?" }]);

    expect(files).toEqual(["global-market.md", "recommendation-rules.md", "gpu-policies.md"]);
  });

  it("adds used-market policy only when the user asks about it", () => {
    const files = selectAiPolicyFiles([{ role: "user", content: "¿Una RTX 3050 usada en Wallapop merece la pena?" }]);

    expect(files).toEqual(["global-market.md", "recommendation-rules.md", "used-market.md", "gpu-policies.md"]);
  });

  it("uses the current build page to select build policies for contextual questions", () => {
    const files = selectAiPolicyFiles(
      [{ role: "user", content: "¿Qué cambiarías de esta?" }],
      { pathname: "/builds/equipo-1440p", route: "build", entityType: "build", entityTitle: "Equipo 1440p" },
    );

    expect(files).toEqual(["global-market.md", "recommendation-rules.md", "build-rules.md"]);
  });

  it("includes the selected Markdown as internal server context", () => {
    const context = resolveAiPolicyContext([{ role: "user", content: "¿DDR4 o DDR5 para mi RAM?" }]);

    expect(context).toContain("Políticas internas de recomendación aplicables");
    expect(context).toContain("global-market.md");
    expect(context).toContain("ram-policies.md");
    expect(context).not.toContain("gpu-policies.md");
  });
});
