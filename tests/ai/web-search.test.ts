import { describe, expect, it } from "vitest";
import { extractPrices } from "@/lib/ai/web-search/price-parser";
import { validateTavilyCandidate } from "@/lib/ai/web-search/validate-price-candidate";

describe("external price evaluation", () => {
  it("extracts a regular EUR price and marks promotional amounts", () => {
    const prices = extractPrices(`AMD Ryzen 7 7800X3D — 379,99 € ${"x".repeat(100)} descuento 329,99 €`);
    expect(prices[0]).toMatchObject({ price: 379.99, currency: "EUR", promotional: false });
    expect(prices[1]).toMatchObject({ price: 329.99, currency: "EUR", promotional: true });
  });

  it("accepts a matching product page from a trusted retailer", () => {
    const candidate = validateTavilyCandidate({
      title: "AMD Ryzen 7 7800X3D",
      url: "https://www.pccomponentes.com/amd-ryzen-7-7800x3d",
      content: "Procesador AMD Ryzen 7 7800X3D. Precio: 379,99 €.",
      score: 0.9,
    }, "AMD Ryzen 7 7800X3D");
    expect(candidate).not.toBeNull();
    expect(candidate).toMatchObject({ retailer: "PcComponentes", price: 379.99, currency: "EUR" });
  });

  it("rejects a variant mismatch, used product and untrusted URL", () => {
    expect(validateTavilyCandidate({
      title: "AMD Ryzen 7 7800X3D reacondicionado",
      url: "https://www.pccomponentes.com/amd-ryzen-7-7800x3d",
      content: "Precio: 250,00 €",
    }, "AMD Ryzen 7 7800X3D")).toBeNull();

    expect(validateTavilyCandidate({
      title: "AMD Ryzen 7 7800X3D",
      url: "https://example.com/amd-ryzen-7-7800x3d",
      content: "Precio: 379,99 €",
    }, "AMD Ryzen 7 7800X3D")).toBeNull();
  });
});
