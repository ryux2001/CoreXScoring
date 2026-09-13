export type AiExternalProvider = "groq" | "cerebras" | "openrouter";

export const AI_PRODUCT_SELECT = [
  "id",
  "slug",
  "market_segment",
  "name",
  "brand",
  "type",
  "category",
  "description",
  "price_base_usd",
  "price_base_eur",
  "price_usd",
  "price_eur",
  "release_date",
  "release_year",
  "compatibility",
  "specs",
  "technologies",
  "benchmarks",
  "tags",
].join(", ");

const SENSITIVE_PATTERNS: Array<[RegExp, string]> = [
  [/-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/gi, "[CLAVE PRIVADA REDACTADA]"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer [TOKEN REDACTADO]"],
  [/(?<![A-Za-z0-9])(?:sk|gsk|rk|or)-[A-Za-z0-9_-]{16,}(?![A-Za-z0-9])/g, "[API KEY REDACTADA]"],
  [/(?:api[_ -]?key|token|secret|password|contrase(?:n|ñ)a)\s*[:=]\s*[^\s,;]+/gi, "[DATO SENSIBLE REDACTADO]"],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[CORREO REDACTADO]"],
];

export function redactSensitiveText(value: string): string {
  return SENSITIVE_PATTERNS.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), value);
}

export function sanitizeChatHref(href: string | undefined): { href: string; external: boolean } | null {
  if (!href) return null;
  const value = href.trim();
  if (!value || value.startsWith("//")) return null;
  if (value.startsWith("/")) return { href: value, external: false };

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return { href: url.toString(), external: true };
  } catch {
    return null;
  }
}
