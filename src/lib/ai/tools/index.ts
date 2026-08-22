import { AI_TOOL_DEFINITIONS } from "./definitions";
import {
  compareComponents,
  getBuild,
  getCombo,
  getComponent,
  getCurrentPageContext,
  recommendComponents,
  searchBuilds,
  searchCombos,
  searchComponents,
} from "./read";
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
  recommend_components: recommendComponents,
  get_current_page_context: getCurrentPageContext,
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
