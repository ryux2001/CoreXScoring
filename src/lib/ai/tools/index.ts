import { AI_TOOL_DEFINITIONS } from "./definitions";
import {
  compareComponents,
  analyzeBuild,
  getBuild,
  getCombo,
  getComponent,
  getCurrentPageContext,
  recommendComponents,
  searchBuilds,
  searchCombos,
  searchComponents,
} from "./read";
import {
  proposeCreateBuild,
  proposeCreateCombo,
  proposeSetCustomPrice,
  planBuild,
  planCombo,
  saveComboDraft,
  saveBuildDraft,
  searchUserBuilds,
  searchUserCombos,
  updateBuildPlan,
  updateComboPlan,
  findExternalPrice,
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
  search_user_combos: searchUserCombos,
  search_user_builds: searchUserBuilds,
  propose_create_combo: proposeCreateCombo,
  propose_create_build: proposeCreateBuild,
  plan_build: planBuild,
  update_build_plan: updateBuildPlan,
  save_build_draft: saveBuildDraft,
  plan_combo: planCombo,
  update_combo_plan: updateComboPlan,
  save_combo_draft: saveComboDraft,
  find_external_price: findExternalPrice,
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

  try {
    return await handler(args, context);
  } catch {
    return { ok: false, error: "La tool no pudo completar la consulta." };
  }
}
