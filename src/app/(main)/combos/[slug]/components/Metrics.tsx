"use client";

import React from 'react';
import { Info } from 'lucide-react';
import { getComboMetrics } from '@/lib/metricsCombos';

interface MetricsProps {
  combo?: any;
}

export default function Metrics({ combo }: MetricsProps) {
  // 🚀 Obtención dinámica de las métricas reales del combo
  const metrics = getComboMetrics(combo);

  const metricsData = [
    { label: 'Potencia Lógica', value: metrics.logicalPower },
    { label: 'Potencia Gráfica', value: metrics.graphicsPower },
    { label: 'Balance', value: metrics.balance },
  ];

  return (
    <div className="flex flex-col p-6 lg:p-8 rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-xl h-full justify-between overflow-hidden min-h-[400px]">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
          Métricas Clave
        </h3>
        
        <div className="group relative">
          <div className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:text-white">
            <Info size={11} strokeWidth={3} />
          </div>
          <div className="invisible absolute right-0 top-7 z-[10000] w-72 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[11px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
            <div className="mb-2 font-bold text-white uppercase tracking-widest text-[9px]">
              Análisis de Capacidades
            </div>
            <p>
              Estimación de rendimiento relativo y equilibrio general del conjunto de piezas frente a los techos teóricos del mercado.
            </p>
          </div>
        </div>
      </div>

      {/* CUERPO: LISTA DE BARRAS DE PROGRESO */}
      <div className="flex-1 flex flex-col justify-center space-y-6">
        {metricsData.map((metric, idx) => {
          const percentage = Math.max(0, Math.min(100, metric.value));

          return (
            <div key={idx} className="flex flex-col gap-2 w-full group">
              
              {/* Fila superior: Nombre + Porcentaje */}
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                  {metric.label}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-black text-white tracking-tighter">
                    {percentage.toFixed(1)}
                  </span>
                  <span className="text-[9px] font-bold text-zinc-700 uppercase">
                    %
                  </span>
                </div>
              </div>

              {/* Barra de progreso horizontal minimalista */}
              <div className="h-2 w-full bg-zinc-900/60 rounded-full border border-zinc-900/30 overflow-hidden p-[2px]">
                <div 
                  className="h-full bg-zinc-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.05)] group-hover:bg-zinc-200"
                  style={{ width: `${percentage}%` }}
                />
              </div>

            </div>
          );
        })}
      </div>

      {/* FOOTER DISCRETO */}
      <div className="mt-8 pt-4 border-t border-zinc-900/20">
        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest leading-tight text-center lg:text-left">
          * Porcentajes normalizados basados en arquitectura de hilos y capacidades de renderizado.
        </p>
      </div>

    </div>
  );
}