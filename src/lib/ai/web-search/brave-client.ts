import type { TavilySearchResult } from "./tavily-client";

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const REQUEST_TIMEOUT_MS = 20_000;

interface BraveSearchResponse {
  web?: {
    results?: Array<{ title?: string; url?: string; description?: string; profile?: { long_name?: string } }>;
  };
}

export class BraveSearchError extends Error {
  constructor(readonly code: string, readonly status?: number) {
    super("No se pudo completar la búsqueda web con Brave.");
  }
}

export async function searchBrave({
  apiKey,
  query,
  includeDomains,
  maxResults,
}: {
  apiKey: string;
  query: string;
  includeDomains: string[];
  maxResults: number;
}): Promise<TavilySearchResult[]> {
  const domainFilter = includeDomains.map((domain) => `site:${domain}`).join(" OR ");
  const url = new URL(BRAVE_SEARCH_URL);
  url.searchParams.set("q", `${query} (${domainFilter})`);
  url.searchParams.set("count", String(Math.min(Math.max(Math.trunc(maxResults), 1), 8)));
  url.searchParams.set("country", "ES");
  url.searchParams.set("search_lang", "es");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new BraveSearchError(response.status === 429 ? "brave_rate_limited" : "brave_request_failed", response.status);
    const payload = await response.json() as BraveSearchResponse;
    return (payload.web?.results || []).map((result) => ({
      title: result.title,
      url: result.url,
      content: result.description,
      score: undefined,
    }));
  } catch (error) {
    if (error instanceof BraveSearchError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw new BraveSearchError("brave_timeout", 504);
    throw new BraveSearchError("brave_network_error", 502);
  } finally {
    clearTimeout(timeout);
  }
}
