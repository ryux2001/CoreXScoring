import { describe, expect, it } from "vitest";
import { formatReleaseDate } from "@/lib/formatReleaseDate";
import { formatPrice } from "@/lib/formatPrice";

describe("localized interface formats", () => {
  it("formats release dates with the active locale", () => {
    const english = formatReleaseDate("2024-01-15", "en", "Unavailable");
    const spanish = formatReleaseDate("2024-01-15", "es", "No disponible");

    expect(english).toContain("2024");
    expect(spanish).toContain("2024");
    expect(english).not.toBe(spanish);
  });

  it("uses the locale-specific unavailable label for invalid dates", () => {
    expect(formatReleaseDate(null, "en", "Unavailable")).toBe("Unavailable");
    expect(formatReleaseDate("n/a", "es", "No disponible")).toBe("No disponible");
  });

  it("formats prices with the active locale", () => {
    expect(formatPrice(1234.5, "en")).toBe("1,234.50");
    expect(formatPrice(1234.5, "es")).toBe("1234,50");
    expect(formatPrice(1234.5, "en", 0)).toBe("1,235");
  });
});
