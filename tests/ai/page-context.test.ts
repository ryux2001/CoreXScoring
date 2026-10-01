import { describe, expect, it } from "vitest";
import { formatPageContextForPrompt } from "@/lib/ai/page-context";
import { localizedAiText } from "@/lib/ai/language";

describe("AI page context", () => {
  it("provides verified comparison limits even when the current comparison is empty", () => {
    const prompt = formatPageContextForPrompt({
      pathname: "/comparator",
      route: "comparator",
      serverResolved: true,
    });

    expect(prompt).toContain("como máximo 3 elementos");
    expect(prompt).toContain("0 de 3 elementos");
    expect(prompt).toContain("mismo tipo");
  });

  it("includes the current comparison count and type", () => {
    const prompt = formatPageContextForPrompt({
      pathname: "/comparator",
      route: "comparator",
      serverResolved: true,
      comparison: {
        itemIds: ["gpu-1", "gpu-2"],
        comparisonType: "components",
        componentType: "gpu",
      },
    });

    expect(prompt).toContain("2 de 3 elementos");
    expect(prompt).toContain("componente: gpu");
  });
});

describe("AI localized truncation copy", () => {
  it("localizes the empty truncated-generation message", () => {
    expect(localizedAiText("es", "responseTruncated")).toContain("Puedes continuar");
    expect(localizedAiText("en", "responseTruncated")).toContain("You can continue");
  });
});
