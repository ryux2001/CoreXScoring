import { TRUSTED_SEARCH_DOMAINS } from "./trusted-domains";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const DEFAULT_MAX_RESULTS = 5;
const MAX_ALLOWED_RESULTS = 8;
const REQUEST_TIMEOUT_MS = 20_000;

export interface TavilySearchResult {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string;
  score?: number;
}

interface TavilySearchResponse {
  results?: TavilySearchResult[];
}

export class TavilySearchError extends Error {
  constructor(readonly code: string, readonly status?: number) {
    super("No se pudo completar la búsqueda web.");
  }
}

function getApiKey(): string {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) throw new TavilySearchError("tavily_not_configured", 503);
  return apiKey;
}

export async function searchTavily({
  apiKey,
  query,
  includeDomains = TRUSTED_SEARCH_DOMAINS,
  maxResults = DEFAULT_MAX_RESULTS,
}: {
  apiKey?: string;
  query: string;
  includeDomains?: string[];
  maxResults?: number;
}): Promise<TavilySearchResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey?.trim() || getApiKey()}`,
      },
      body: JSON.stringify({
        query,
        search_depth: process.env.WEB_SEARCH_DEFAULT_DEPTH?.trim() === "advanced" ? "advanced" : "basic",
        max_results: Math.min(Math.max(Math.trunc(maxResults), 1), MAX_ALLOWED_RESULTS),
        include_domains: includeDomains,
        include_answer: false,
        include_raw_content: process.env.WEB_SEARCH_INCLUDE_RAW_CONTENT?.trim().toLowerCase() === "false" ? false : "markdown",
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new TavilySearchError(response.status === 429 ? "tavily_rate_limited" : "tavily_request_failed", response.status);
    }

    let payload: TavilySearchResponse;
    try {
      payload = await response.json() as TavilySearchResponse;
    } catch {
      throw new TavilySearchError("tavily_invalid_payload", 502);
    }

    return Array.isArray(payload.results) ? payload.results : [];
  } catch (error) {
    if (error instanceof TavilySearchError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new TavilySearchError("tavily_timeout", 504);
    }
    throw new TavilySearchError("tavily_network_error", 502);
  } finally {
    clearTimeout(timeout);
  }
}
