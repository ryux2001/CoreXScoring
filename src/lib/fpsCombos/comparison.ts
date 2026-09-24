import { getComponentNotes } from "@/lib/scoring/components";
import { getBuildPartPrice } from "@/lib/scoring/builds";
import { getComboPartPrice } from "@/lib/scoring/combos";
import { calculateComboFps } from "./index";
import type { FpsResult, GameData } from "./types";

export type ComparisonFpsKind = "gpu" | "combo" | "build";
export type ComparisonFpsResolution = "1080p" | "1440p" | "4k";

type Row = Record<string, unknown>;

export interface ComparisonFpsItem {
  id: string | number;
  type?: string;
  comparisonType?: string;
  name?: string;
  title?: string;
  gpu?: Row;
  cpu?: Row;
  ram?: Row;
}

function asRow(value: unknown): Row {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function asNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function getGamingScore(component: Row, price: number): number | undefined {
  const notes = getComponentNotes(component, price);
  return asNumber(notes.Gaming ?? notes.Juegos) ?? undefined;
}

function getCollectionScores(item: ComparisonFpsItem): { cpuGamingScore?: number; ramGamingScore?: number } {
  const isBuild = item.comparisonType === "build" || String(item.type).toUpperCase() === "BUILD";
  const scores: { cpuGamingScore?: number; ramGamingScore?: number } = {};

  for (const part of ["cpu", "ram"]) {
    const component = asRow((item as unknown as Row)[part]);
    if (!component.id) continue;
    const price = isBuild
      ? getBuildPartPrice(item as Parameters<typeof getBuildPartPrice>[0], part, "USD")
      : getComboPartPrice(item as unknown as Row, part as "cpu" | "ram", "USD");
    const score = getGamingScore(component, price);
    if (score === undefined) continue;
    if (part === "cpu") scores.cpuGamingScore = score;
    if (part === "ram") scores.ramGamingScore = score;
  }

  return scores;
}

export function getComparisonFpsKind(item: ComparisonFpsItem): ComparisonFpsKind | null {
  if (item.comparisonType === "build" || String(item.type).toUpperCase() === "BUILD") return "build";
  if (item.comparisonType === "combo" || String(item.type).toUpperCase() === "COMBO") return "combo";
  return String(item.type).toUpperCase() === "GPU" ? "gpu" : null;
}

export function getDirectComparisonGpuFps(
  item: ComparisonFpsItem,
  game: GameData,
  resolution: ComparisonFpsResolution,
  preset: string,
): number | null {
  const gpuData = game.gpu_fps_base[String(item.id)];
  const value = gpuData?.[resolution]?.[preset];
  const fps = asNumber(value);
  return fps !== null && fps > 0 ? Math.round(fps) : null;
}

export function getComparisonFps(
  item: ComparisonFpsItem,
  game: GameData,
  preset: string,
  resolution?: ComparisonFpsResolution,
): number | null | FpsResult {
  const kind = getComparisonFpsKind(item);
  if (!kind) return null;

  if (kind === "gpu") {
    return resolution ? getDirectComparisonGpuFps(item, game, resolution, preset) : null;
  }

  const result = calculateComboFps(item, game, preset, getCollectionScores(item));
  if (!resolution) return result;
  return result[resolution === "1080p" ? "fhd" : resolution === "1440p" ? "qhd" : "uhd"] > 0
    ? result[resolution === "1080p" ? "fhd" : resolution === "1440p" ? "qhd" : "uhd"]
    : null;
}

export function getComparisonFpsResult(
  item: ComparisonFpsItem,
  game: GameData,
  preset: string,
  resolution: ComparisonFpsResolution,
): number | null {
  return getComparisonFps(item, game, preset, resolution) as number | null;
}
