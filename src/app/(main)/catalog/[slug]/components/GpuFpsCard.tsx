"use client";

import { useEffect, useMemo, useState } from "react";
import { Gamepad2, Info, Sliders } from "lucide-react";

interface GpuFpsCardProps {
  product: {
    id?: unknown;
  };
  games: Array<{
    id: string;
    name: string;
    gpu_fps_base?: unknown;
  }>;
}

type Resolution = "1080p" | "1440p" | "4k";
type FpsData = Record<string, Record<string, Record<string, unknown>>>;

const resolutions: Array<{ label: string; key: Resolution }> = [
  { label: "1080p", key: "1080p" },
  { label: "1440p", key: "1440p" },
  { label: "4K", key: "4k" },
];

function parseFpsData(value: unknown): FpsData {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }

  return value && typeof value === "object" && !Array.isArray(value)
    ? value as FpsData
    : {};
}

function getGpuFpsData(game: GpuFpsCardProps["games"][number], gpuId: string) {
  const data = parseFpsData(game.gpu_fps_base)[gpuId];
  return data && typeof data === "object" ? data : {};
}

function hasFpsData(game: GpuFpsCardProps["games"][number], gpuId: string) {
  const gpuData = getGpuFpsData(game, gpuId);

  return resolutions.some(({ key }) => {
    const presets = gpuData[key];
    return presets && Object.values(presets).some((value) => Number(value) > 0);
  });
}

function getAvailablePresets(
  game: GpuFpsCardProps["games"][number] | undefined,
  gpuId: string,
) {
  if (!game) return [];

  const gpuData = getGpuFpsData(game, gpuId);
  const firstResolution = resolutions
    .map(({ key }) => gpuData[key])
    .find((presets) => presets && Object.keys(presets).length > 0);

  return firstResolution ? Object.keys(firstResolution) : [];
}

function getFps(
  game: GpuFpsCardProps["games"][number] | undefined,
  gpuId: string,
  resolution: Resolution,
  preset: string,
) {
  if (!game) return null;

  const value = getGpuFpsData(game, gpuId)[resolution]?.[preset];
  const fps = Number(value);

  return Number.isFinite(fps) && fps > 0 ? fps : null;
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

export default function GpuFpsCard({ product, games }: GpuFpsCardProps) {
  const gpuId = String(product.id ?? "");
  const availableGames = useMemo(
    () => games.filter((game) => hasFpsData(game, gpuId)),
    [games, gpuId],
  );
  const [selectedGameId, setSelectedGameId] = useState(availableGames[0]?.id ?? "");
  const activeGame = availableGames.find((game) => game.id === selectedGameId) ?? availableGames[0];
  const availablePresets = useMemo(
    () => getAvailablePresets(activeGame, gpuId),
    [activeGame, gpuId],
  );
  const [selectedQuality, setSelectedQuality] = useState(availablePresets[0] ?? "medio");

  useEffect(() => {
    if (!availableGames.some((game) => game.id === selectedGameId)) {
      setSelectedGameId(availableGames[0]?.id ?? "");
    }
  }, [availableGames, selectedGameId]);

  useEffect(() => {
    if (availablePresets.length > 0 && !availablePresets.includes(selectedQuality)) {
      setSelectedQuality(availablePresets[0]);
    }
  }, [availablePresets, selectedQuality]);

  const fpsMetrics = resolutions.map(({ label, key }) => ({
    label,
    value: getFps(activeGame, gpuId, key, selectedQuality),
  }));

  return (
    <section className="relative flex w-full flex-col rounded-3xl border border-zinc-900 bg-zinc-950/50 p-6 shadow-xl lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-center lg:gap-4 lg:p-8">
      <div className="group absolute right-6 top-6 z-10 lg:right-5 lg:top-5">
        <button
          type="button"
          aria-label="Información sobre los FPS mostrados"
          className="flex h-7 w-7 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-600/70"
        >
          <Info size={11} strokeWidth={3} />
        </button>
        <div className="invisible absolute right-0 top-9 z-[10000] w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[12px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          <div className="mb-2 font-bold uppercase tracking-widest text-[12px] text-white">
            FPS aproximados
          </div>
          <p>
            Estos valores son aproximados y pueden variar según los controladores, la configuración del sistema y las condiciones reales de uso.
          </p>
        </div>
      </div>

      <div className="relative mb-5 lg:mb-0">
        <div className="flex flex-wrap items-center justify-between gap-4 lg:flex-col lg:items-start lg:justify-start">
          <div className="pr-8 lg:pr-0">
            <h2 className="text-[14px] font-extrabold uppercase tracking-[0.16em] text-zinc-100">
              FPS en juegos
            </h2>
            <p className="mt-1 text-[10px] font-medium text-zinc-400">
              Valores directos de la base de datos
            </p>
          </div>

          {availableGames.length > 0 && (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <label className="flex min-w-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">
                <Gamepad2 size={12} className="shrink-0 text-zinc-400" />
                <span className="sr-only">Juego</span>
                <select
                  value={selectedGameId}
                  onChange={(event) => setSelectedGameId(event.target.value)}
                  className="min-h-9 max-w-[10rem] min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-bold normal-case tracking-normal text-zinc-200 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/50"
                  aria-label="Seleccionar juego"
                >
                  {availableGames.map((game) => (
                    <option key={game.id} value={game.id} className="bg-zinc-950 text-zinc-200">
                      {game.name}
                    </option>
                  ))}
                </select>
              </label>

              {availablePresets.length > 0 && (
                <label className="flex min-w-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">
                  <Sliders size={12} className="shrink-0 text-zinc-400" />
                  <span className="sr-only">Calidad gráfica</span>
                  <select
                    value={selectedQuality}
                    onChange={(event) => setSelectedQuality(event.target.value)}
                    className="min-h-9 rounded-xl border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-bold capitalize text-zinc-200 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/50"
                    aria-label="Seleccionar calidad gráfica"
                  >
                    {availablePresets.map((preset) => (
                      <option key={preset} value={preset} className="bg-zinc-950 text-zinc-200">
                        {preset}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
        </div>

      </div>

      {availableGames.length === 0 ? (
        <p className="py-4 text-sm font-medium text-zinc-500">No disponible</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {fpsMetrics.map((metric) => {
            const styles = getFpsStyles(metric.value);

            return (
              <div
                key={metric.label}
                className={`font-display flex min-h-24 flex-col items-center justify-center rounded-2xl border p-3 ${styles.border} ${styles.bg}`}
              >
              <span className={`mb-2 text-[10px] font-black uppercase tracking-[0.15em] ${styles.label}`}>
                  {metric.label}
                </span>
                <span className={`text-[32px] font-bold leading-none tracking-[-0.03em] tabular-nums ${styles.text}`}>
                  {metric.value ?? "—"}
                </span>
                <span className="mt-1 text-[8px] font-bold uppercase tracking-widest text-zinc-600">
                  FPS
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
