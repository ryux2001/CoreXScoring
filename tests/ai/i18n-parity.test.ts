import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import es from "@/messages/es.json";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertMatchingShape(left: JsonValue, right: JsonValue, path = ""): void {
  expect(Array.isArray(left), `${path} must have the same value type`).toBe(Array.isArray(right));
  expect(isRecord(left), `${path} must have the same value type`).toBe(isRecord(right));

  if (Array.isArray(left) && Array.isArray(right)) {
    expect(left).toHaveLength(right.length);
    left.forEach((value, index) => assertMatchingShape(value, right[index], `${path}[${index}]`));
    return;
  }

  if (!isRecord(left) || !isRecord(right)) return;

  expect(Object.keys(left).sort(), `${path} must have the same keys`).toEqual(Object.keys(right).sort());
  for (const key of Object.keys(left)) assertMatchingShape(left[key], right[key], path ? `${path}.${key}` : key);
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{\s*([A-Za-z][A-Za-z0-9_]*)\b/g)].map((match) => match[1]).sort();
}

function assertMatchingPlaceholders(left: JsonValue, right: JsonValue, path = ""): void {
  if (typeof left === "string" && typeof right === "string") {
    expect(placeholders(left), `${path} must use the same ICU placeholders`).toEqual(placeholders(right));
    return;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    left.forEach((value, index) => assertMatchingPlaceholders(value, right[index], `${path}[${index}]`));
    return;
  }

  if (!isRecord(left) || !isRecord(right)) return;
  for (const key of Object.keys(left)) assertMatchingPlaceholders(left[key], right[key], path ? `${path}.${key}` : key);
}

describe("translation catalog parity", () => {
  it("keeps English and Spanish catalog key shapes and ICU placeholders aligned", () => {
    assertMatchingShape(en, es);
    assertMatchingPlaceholders(en, es);
  });

  it("keeps combo presentation labels available in both locales", () => {
    for (const catalog of [en, es]) {
      expect(catalog.combos.countLabel).toBeTruthy();
      expect(catalog.combos.searchPlaceholder).toBeTruthy();
      expect(catalog.combos.componentRoles.cpu).toBeTruthy();
      expect(catalog.combos.componentRoles.gpu).toBeTruthy();
      expect(catalog.combos.componentRoles.ram).toBeTruthy();
      expect(catalog.combos.fpsTitle).toBeTruthy();
      expect(catalog.combos.metricsTitle).toBeTruthy();
      expect(catalog.catalog.scoreLabels.bottleneck).toBeTruthy();
      expect(catalog.catalog.fps.presets.medium).toBeTruthy();
    }
  });

  it("keeps deletion confirmation aligned with the account protocol", () => {
    expect(en.account.typeConfirmation).toContain("ELIMINAR");
    expect(es.account.typeConfirmation).toContain("ELIMINAR");
  });

  it("documents every currently supported external AI provider", () => {
    for (const catalog of [en, es]) {
      expect(catalog.legal.privacy.aiProviders.dataSharing).toContain("Groq");
      expect(catalog.legal.privacy.aiProviders.dataSharing).toContain("Cerebras");
      expect(catalog.legal.privacy.aiProviders.dataSharing).toContain("OpenRouter");
    }
  });

  it("keeps the hidden continuation guardrails localized", () => {
    expect(en.ai.chat.continueInstruction).toContain("Do not repeat content");
    expect(en.ai.chat.continueInstruction).toContain("tools");
    expect(es.ai.chat.continueInstruction).toContain("No repitas contenido");
    expect(es.ai.chat.continueInstruction).toContain("herramientas");
  });
});
