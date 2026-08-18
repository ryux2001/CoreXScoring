"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Info, Gamepad2, Sliders } from 'lucide-react';
import { GameData } from '@/lib/fpsCombos/types';
import { getAvailablePresets, calculateComboFps } from '@/lib/fpsCombos';

interface FpsCardProps {
  combo?: any;
  games?: GameData[];
  cpuGamingScore?: number;
  ramGamingScore?: number;
}

const getFpsStyles = (fps: number) => {
  if (fps > 144) {
    return {
      border: 'border-purple-500/50',
      bg: 'bg-purple-950/30',
      text: 'text-purple-300',
      label: 'text-purple-400/80',
    };
  }

  if (fps > 90) {
    return {
      border: 'border-blue-500/50',
      bg: 'bg-blue-950/30',
      text: 'text-blue-300',
      label: 'text-blue-400/80',
    };
  }

  if (fps > 60) {
    return {
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-950/30',
      text: 'text-emerald-300',
      label: 'text-emerald-400/80',
    };
  }

  if (fps > 30) {
    return {
      border: 'border-yellow-500/50',
      bg: 'bg-yellow-950/30',
      text: 'text-yellow-300',
      label: 'text-yellow-400/80',
    };
  }

  return {
    border: 'border-red-500/50',
    bg: 'bg-red-950/30',
    text: 'text-red-300',
    label: 'text-red-400/80',
  };
};

export default function FpsCard({
  combo,
  games = [],
  cpuGamingScore = 8.5,
  ramGamingScore = 9.0,
}: FpsCardProps) {
  // Estado del juego seleccionado
  const [selectedGameId, setSelectedGameId] = useState<string>(games[0]?.id || '');
  // Objeto del juego activo
  const activeGame = useMemo(() => {
    return games.find((g) => g.id === selectedGameId) || games[0];
  }, [games, selectedGameId]);

  // Presets disponibles detectados dinámicamente para el juego activo
  const availablePresets = useMemo(() => {
    return getAvailablePresets(activeGame);
  }, [activeGame]);

  // Estado del preset seleccionado
  const [selectedQuality, setSelectedQuality] = useState<string>(availablePresets[0] || 'medio');

  // Si el usuario cambia de juego y el preset actual no existe en el nuevo juego, reseteamos al primero disponible
  useEffect(() => {
    if (availablePresets.length > 0 && !availablePresets.includes(selectedQuality)) {
      setSelectedQuality(availablePresets[0]);
    }
  }, [availablePresets, selectedQuality]);

  // Cálculo de FPS final en tiempo real
  const fps = useMemo(() => {
    if (!activeGame) return { fhd: 0, qhd: 0, uhd: 0 };
    return calculateComboFps(combo, activeGame, selectedQuality, {
      cpuGamingScore,
      ramGamingScore,
    });
  }, [combo, activeGame, selectedQuality, cpuGamingScore, ramGamingScore]);

  // Helper para formatear los nombres de los presets (ej. "bajo" -> "Bajo")
  const formatPresetLabel = (preset: string) => {
    return preset.charAt(0).toUpperCase() + preset.slice(1);
  };

  const fpsMetrics = [
    { label: '1080p', value: fps.fhd },
    { label: '1440p', value: fps.qhd },
    { label: '4K', value: fps.uhd },
  ];

  return (
    <div className="flex flex-col p-6 lg:p-8 rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-xl h-full justify-between overflow-hidden min-h-[400px]">
      {/* HEADER: SELECTORES + INFO */}
      <div className="relative mb-6">
        <div className="flex min-w-0 flex-wrap items-center gap-4 pr-10">
          <div className="mr-1">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-zinc-100">
              FPS estimados
            </h2>
            <p className="mt-1 text-[10px] font-medium text-zinc-500">
              Rendimiento nativo por resolución
            </p>
          </div>
          {/* Selector de Juego */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
              <Gamepad2 size={12} className="text-zinc-400" />
              Juego:
            </span>
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="min-h-10 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-bold text-zinc-200 outline-none transition-colors focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/50 cursor-pointer"
            >
              {games.map((game) => (
                <option key={game.id} value={game.id} className="bg-zinc-950 text-zinc-200">
                  {game.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selector Dinámico de Gráficos */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
              <Sliders size={12} className="text-zinc-400" />
              Gráficos:
            </span>
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              className="min-h-10 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-bold text-zinc-200 outline-none transition-colors focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/50 cursor-pointer capitalize"
            >
              {availablePresets.map((preset) => (
                <option key={preset} value={preset} className="bg-zinc-950 text-zinc-200">
                  {formatPresetLabel(preset)}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* TOOLTIP INFO */}
        <div className="group absolute right-0 top-0">
          <button
            type="button"
            aria-label="Información sobre la estimación de FPS"
            className="flex h-7 w-7 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-600/70"
          >
            <Info size={11} strokeWidth={3} />
          </button>
          <div className="invisible absolute right-0 top-9 z-[10000] w-72 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[11px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            <div className="mb-2 font-bold text-white uppercase tracking-widest text-[9px]">
              Estimación de FPS
            </div>
            <p>
              Cálculo promedio considerando la GPU, el límite de la CPU y la penalización de la memoria RAM.
            </p>
          </div>
        </div>

      </div>

      {/* CUERPO: CAJAS DE FPS */}
      <div className="my-auto grid grid-cols-1 gap-4 md:grid-cols-3">
        {fpsMetrics.map((metric) => {
          const styles = getFpsStyles(metric.value);

          return (
            <div
              key={metric.label}
              className={`group flex flex-col items-center justify-center rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 ${styles.border} ${styles.bg}`}
            >
              <span className={`mb-3 text-[10px] font-black uppercase tracking-[0.2em] ${styles.label}`}>
                {metric.label}
              </span>
              <div className="flex items-baseline gap-1">
                <span className={`font-semibold text-5xl leading-none tracking-[-0.03em] tabular-nums ${styles.text}`}>
                  {metric.value}
                </span>
                
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="mt-6 pt-4 border-t border-zinc-900/20">
        <p className="text-[9px] font-bold uppercase tracking-widest leading-tight text-zinc-500 text-center lg:text-left">
          * Rendimiento nativo estimado sin tecnologías de reescalado (DLSS / FSR).
        </p>
      </div>

    </div>
  );
}
