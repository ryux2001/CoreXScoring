import type { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { AiResolvedPriceContext, BuildDraft, CatalogPriceEvaluationRequest, ComboDraft, ComparisonUiAction, PageContext, PendingAction, RecommendationState } from "../types";
import type { CatalogPriceEvaluation } from "@/lib/catalog/price-evaluation";

export type AiSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export interface AiActor {
  id: string;
  isAnonymous: boolean;
}

export interface AiToolContext {
  supabase: AiSupabaseClient;
  /** Privileged client used only by server-side action proposal RPCs. */
  actionSupabase?: AiSupabaseClient;
  requestId?: string;
  actor: AiActor;
  pageContext?: PageContext;
  ipHash?: string | null;
  buildDraft?: BuildDraft;
  comboDraft?: ComboDraft;
  recommendationState?: RecommendationState;
  catalogPriceEvaluation?: CatalogPriceEvaluationRequest;
  priceContext?: AiResolvedPriceContext;
  /** Capabilities are derived server-side for the current request. */
  allowedTools?: readonly string[];
}

export interface AiToolSuccess {
  ok: true;
  data: unknown;
  pendingAction?: PendingAction;
  buildDraft?: BuildDraft;
  comboDraft?: ComboDraft;
  recommendationState?: RecommendationState;
  catalogPriceEvaluation?: CatalogPriceEvaluation;
  catalogPriceUpdate?: CatalogPriceEvaluation;
  comparisonAction?: ComparisonUiAction;
}

export interface AiToolFailure {
  ok: false;
  error: string;
}

export type AiToolResult = AiToolSuccess | AiToolFailure;
