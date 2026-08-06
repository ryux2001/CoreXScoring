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

  return (
    <div className="flex flex-col p-6 lg:p-8 rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-xl h-full justify-between overflow-hidden min-h-[400px]">
      
      {/* HEADER: SELECTORES + INFO */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Selector de Juego */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 flex items-center gap-1.5">
              <Gamepad2 size={12} className="text-zinc-400" />
              Juego:
            </span>
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-200 outline-none focus:border-zinc-700 transition-colors cursor-pointer"
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
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 flex items-center gap-1.5">
              <Sliders size={12} className="text-zinc-400" />
              Gráficos:
            </span>
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-200 outline-none focus:border-zinc-700 transition-colors cursor-pointer capitalize"
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
        <div className="group relative ml-auto">
          <div className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:text-white">
            <Info size={11} strokeWidth={3} />
          </div>
          <div className="invisible absolute right-0 top-7 z-[10000] w-72 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[11px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
            <div className="mb-2 font-bold text-white uppercase tracking-widest text-[9px]">
              Estimación de Fotogramas
            </div>
            <p>
              Cálculo promedio de FPS proyectado considerando la GPU, el cuello de botella de la CPU y la penalización de memoria RAM.
            </p>
          </div>
        </div>

      </div>

      {/* CUERPO: CAJAS DE FPS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-auto">
        
        {/* Box 1080p */}
        <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-zinc-900 bg-zinc-900/30 transition-all hover:border-zinc-800 group">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 group-hover:text-zinc-400 transition-colors">
            FPS 1080p
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl lg:text-4xl font-black text-white ">
              {fps.fhd}
            </span>
            <span className="text-[10px] font-bold text-zinc-600 uppercase">
              fps
            </span>
          </div>
        </div>

        {/* Box 1440p */}
        <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-zinc-900 bg-zinc-900/30 transition-all hover:border-zinc-800 group">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 group-hover:text-zinc-400 transition-colors">
            FPS 1440p
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl lg:text-4xl font-black text-white tracking-tighter">
              {fps.qhd}
            </span>
            <span className="text-[10px] font-bold text-zinc-600 uppercase">
              fps
            </span>
          </div>
        </div>

        {/* Box 4K */}
        <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-zinc-900 bg-zinc-900/30 transition-all hover:border-zinc-800 group">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 group-hover:text-zinc-400 transition-colors">
            FPS 4K
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl lg:text-4xl font-black text-white tracking-tighter">
              {fps.uhd}
            </span>
            <span className="text-[10px] font-bold text-zinc-600 uppercase">
              fps
            </span>
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <div className="mt-6 pt-4 border-t border-zinc-900/20">
        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest leading-tight text-center lg:text-left">
          * Rendimiento nativo estimado sin tecnologías de reescalado (DLSS / FSR).
        </p>
      </div>

    </div>
  );
}