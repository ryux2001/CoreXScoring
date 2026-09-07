"use client";

import { useMemo, useState } from "react";
import { Gamepad2, Sliders } from "lucide-react";
import { calculateComboFps } from "@/lib/fpsCombos";
import type { GameData } from "@/lib/fpsCombos/types";
import { isBuildItem, isComboItem } from "./comparisonUtils";

type Resolution = "1080p" | "1440p" | "4k";
type ComparisonKind = "gpu" | "combo" | "build";
interface ComparisonItem {
  id: string | number;
  type?: string;
  name?: string;
  title?: string;
}

const resolutions: Array<{ label: string; key: Resolution }> = [
  { label: "1080p", key: "1080p" },
  { label: "1440p", key: "1440p" },
  { label: "4K", key: "4k" },
];

function parseObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }

  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeGame(game: GameData): GameData {
  return {
    ...game,
    gpu_fps_base: parseObject(game.gpu_fps_base) as GameData["gpu_fps_base"],
  };
}

function getComparisonKind(items: ComparisonItem[]): ComparisonKind | null {
  if (items.length === 0) return null;
  if (items.every(isBuildItem)) return "build";
  if (items.every(isComboItem)) return "combo";

  return items.every((item) => String(item?.type || "").toUpperCase() === "GPU")
    ? "gpu"
    : null;
}

function getGamePresets(game: GameData): string[] {
  const presets = new Set<string>();
  const gpuData = parseObject(game.gpu_fps_base);

  Object.values(gpuData).forEach((gpu) => {
    Object.values(parseObject(gpu)).forEach((resolutionData) => {
      Object.keys(parseObject(resolutionData)).forEach((preset) => presets.add(preset));
    });
  });

  return presets.size > 0 ? Array.from(presets) : ["medio"];
}

function getDirectGpuFps(
  item: ComparisonItem,
  game: GameData,
  resolution: Resolution,
  preset: string,
): number | null {
  const gpuData = parseObject(game.gpu_fps_base)[String(item.id)];
  const resolutionData = parseObject(gpuData)[resolution];
  const value = parseObject(resolutionData)[preset];
  const fps = Number(value);

  return Number.isFinite(fps) && fps > 0 ? Math.round(fps) : null;
}

function getFpsStyles(fps: number | null) {
  if (fps === null) {
    return {
      border: "border-zinc-800",
      bg: "bg-zinc-900/40",
      text: "text-zinc-500",
      label: "text-zinc-600",
    };
  }

  if (fps > 144) {
    return {
      border: "border-purple-500/50",
      bg: "bg-purple-950/30",
      text: "text-purple-300",
      label: "text-purple-400/80",
    };
  }

  if (fps > 90) {
    return {
      border: "border-blue-500/50",
      bg: "bg-blue-950/30",
      text: "text-blue-300",
      label: "text-blue-400/80",
    };
  }

  if (fps > 60) {
    return {
      border: "border-emerald-500/50",
      bg: "bg-emerald-950/30",
      text: "text-emerald-300",
      label: "text-emerald-400/80",
    };
  }

  if (fps > 30) {
    return {
      border: "border-yellow-500/50",
      bg: "bg-yellow-950/30",
      text: "text-yellow-300",
      label: "text-yellow-400/80",
    };
  }

  return {
    border: "border-red-500/50",
    bg: "bg-red-950/30",
    text: "text-red-300",
    label: "text-red-400/80",
  };
}

function getCollectionFps(
  item: ComparisonItem,
  game: GameData,
  preset: string,
  resolution: Resolution,
): number | null {
  const result = calculateComboFps(item, game, preset, {
    cpuGamingScore: 8.5,
    ramGamingScore: 9,
  });
  const fps = result[resolution === "1080p" ? "fhd" : resolution === "1440p" ? "qhd" : "uhd"];

  return fps > 0 ? fps : null;
}

function hasGameData(item: ComparisonItem, game: GameData, kind: ComparisonKind): boolean {
  if (kind === "gpu") {
    const gpuData = parseObject(game.gpu_fps_base)[String(item.id)];
    return Object.values(parseObject(gpuData)).some((resolutionData) =>
      Object.values(parseObject(resolutionData)).some((value) => Number(value) > 0),
    );
  }

  return getGamePresets(game).some((preset) =>
    Object.values(calculateComboFps(item, game, preset)).some((value) => value > 0),
  );
}

interface ComparatorFpsIslandProps {
  items: ComparisonItem[];
  games: GameData[];
}

export default function ComparatorFpsIsland({ items, games }: ComparatorFpsIslandProps) {
  const kind = getComparisonKind(items);
  const normalizedGames = useMemo(() => games.map(normalizeGame), [games]);
  const availableGames = useMemo(
    () => kind
      ? normalizedGames.filter((game) => items.every((item) => hasGameData(item, game, kind)))
      : [],
    [items, kind, normalizedGames],
  );
  const [selectedGameId, setSelectedGameId] = useState(() => String(availableGames[0]?.id ?? ""));
  const activeGame = availableGames.find((game) => String(game.id) === selectedGameId) ?? availableGames[0];
  const activeGameId = String(activeGame?.id ?? "");
  const availablePresets = useMemo(
    () => activeGame ? getGamePresets(activeGame) : ["medio"],
    [activeGame],
  );
  const [selectedQuality, setSelectedQuality] = useState("medio");
  const activeQuality = availablePresets.includes(selectedQuality)
    ? selectedQuality
    : availablePresets[0] ?? "medio";

  if (!kind) return null;

  return (
    <section
      aria-labelledby="comparator-fps-title"
      className="mt-8 w-full max-w-255 overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-xl"
    >
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-zinc-900 px-5 py-5 md:px-6">
        <div>
          <h2 id="comparator-fps-title" className="text-[14px] font-extrabold uppercase tracking-[0.16em] text-zinc-100">
            FPS en juegos
          </h2>
          <p className="mt-1 text-[10px] font-medium text-zinc-400">
            {kind === "gpu" ? "Valores directos por tarjeta" : "Rendimiento estimado por resolución"}
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <label className="flex min-w-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">
            <Gamepad2 size={12} className="shrink-0 text-zinc-400" />
            <span className="sr-only">Juego</span>
            <select
              value={activeGameId}
              onChange={(event) => setSelectedGameId(event.target.value)}
              aria-label="Seleccionar juego"
              disabled={availableGames.length === 0}
              className="min-h-9 max-w-[11rem] min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-bold normal-case tracking-normal text-zinc-200 outline-none transition-colors focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {availableGames.length === 0 ? (
                <option value="">Sin datos</option>
              ) : (
                availableGames.map((game) => (
                  <option key={game.id} value={game.id} className="bg-zinc-950 text-zinc-200">
                    {game.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="flex min-w-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">
            <Sliders size={12} className="shrink-0 text-zinc-400" />
            <span className="sr-only">Calidad gráfica</span>
            <select
              value={activeQuality}
              onChange={(event) => setSelectedQuality(event.target.value)}
              aria-label="Seleccionar calidad gráfica"
              disabled={!activeGame}
              className="min-h-9 rounded-xl border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-bold capitalize text-zinc-200 outline-none transition-colors focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {availablePresets.map((preset) => (
                <option key={preset} value={preset} className="bg-zinc-950 text-zinc-200">
                  {preset}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {activeGame ? (
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            className="grid min-w-[620px] gap-3 p-4 md:min-w-0 md:grid-cols-3 md:gap-4 md:p-5"
            style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
          >
            {items.map((item) => (
              <article key={item.id} className="min-w-0 rounded-2xl border border-zinc-900 bg-black/30 p-3 md:p-4">
                <h3 className="mb-3 truncate text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400" title={String(item.name || item.title || "Sin nombre")}>
                  {String(item.name || item.title || "Sin nombre")}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {resolutions.map(({ label, key }) => {
                    const value = kind === "gpu"
                      ? getDirectGpuFps(item, activeGame, key, activeQuality)
                      : getCollectionFps(item, activeGame, activeQuality, key);
                    const styles = getFpsStyles(value);

                    return (
                      <div key={key} className={`flex min-h-24 flex-col items-center justify-center rounded-xl border p-2 ${styles.border} ${styles.bg}`}>
                        <span className={`mb-2 text-[9px] font-black uppercase tracking-[0.12em] ${styles.label}`}>
                          {label}
                        </span>
                        <span className={`font-display text-[28px] font-bold leading-none tracking-[-0.03em] tabular-nums ${styles.text}`}>
                          {value ?? "—"}
                        </span>
                        <span className="mt-1 text-[8px] font-bold uppercase tracking-widest text-zinc-600">
                          FPS
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-sm font-medium text-zinc-500">
          No hay datos de FPS para los elementos comparados.
        </p>
      )}
    </section>
  );
}
