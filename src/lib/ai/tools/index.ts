import { AI_TOOL_DEFINITIONS } from "./definitions";
import {
  compareComponents,
  analyzeBuild,
  getBuild,
  getCombo,
  getComponent,
  getCurrentComparison,
  getCurrentPageContext,
  getGameFps,
  proposeAddToComparison,
  proposeRemoveFromComparison,
  proposeSetComparisonPrice,
  proposeUpdateComparison,
  recommendComponents,
  searchBuilds,
  searchCombos,
  searchComponents,
  setCurrentCatalogPrice,
} from "./read";
import {
  proposeSetCustomPrice,
  planBuild,
  planCombo,
  saveComboDraft,
  saveBuildDraft,
  searchUserBuilds,
  searchUserCombos,
  updateBuildPlan,
  updateComboPlan,
  updateBuildRecommendationState,
  updateComboRecommendationState,
} from "../actions";
import type { AiToolContext, AiToolResult } from "./types";

type AiToolHandler = (args: unknown, context: AiToolContext) => Promise<AiToolResult>;

const AI_TOOL_HANDLERS: Record<string, AiToolHandler> = {
  search_components: searchComponents,
  get_component: getComponent,
  compare_components: compareComponents,
  search_combos: searchCombos,
  get_combo: getCombo,
  search_builds: searchBuilds,
  get_build: getBuild,
  analyze_build: analyzeBuild,
  recommend_components: recommendComponents,
  get_current_page_context: getCurrentPageContext,
  get_current_comparison: getCurrentComparison,
  get_game_fps: getGameFps,
  propose_add_to_comparison: proposeAddToComparison,
  propose_remove_from_comparison: proposeRemoveFromComparison,
  propose_set_comparison_price: proposeSetComparisonPrice,
  propose_update_comparison: proposeUpdateComparison,
  set_current_catalog_price: setCurrentCatalogPrice,
  search_user_combos: searchUserCombos,
  search_user_builds: searchUserBuilds,
  plan_build: planBuild,
  update_build_recommendation_state: updateBuildRecommendationState,
  update_build_plan: updateBuildPlan,
  save_build_draft: saveBuildDraft,
  plan_combo: planCombo,
  update_combo_recommendation_state: updateComboRecommendationState,
  update_combo_plan: updateComboPlan,
  save_combo_draft: saveComboDraft,
  propose_set_custom_price: proposeSetCustomPrice,
};

export { AI_TOOL_DEFINITIONS };

/** Ejecuta únicamente tools registradas y convierte fallos internos en resultados seguros para el modelo. */
export async function executeAiTool(
  name: string,
  args: unknown,
  context: AiToolContext,
): Promise<AiToolResult> {
  const handler = AI_TOOL_HANDLERS[name];
  if (!handler) return { ok: false, error: "La tool solicitada no está disponible." };
  if (context.allowedTools && !context.allowedTools.includes(name)) {
    return { ok: false, error: "La operación no está autorizada para esta solicitud." };
  }

  try {
    return await handler(args, context);
  } catch {
    return { ok: false, error: "La tool no pudo completar la consulta." };
  }
}
