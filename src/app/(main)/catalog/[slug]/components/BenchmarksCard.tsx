"use client";

import { Info } from 'lucide-react';
import { getMetricPercentage, getProductMetrics, type ProductForMetrics } from '@/lib/metricsProducts';

interface BenchmarksCardProps {
  product: ProductForMetrics;
}

export default function BenchmarksCard({ product }: BenchmarksCardProps) {
  const metrics = getProductMetrics(product);

  return (
    <div className="flex flex-col p-6 lg:p-8 rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-xl h-full justify-between overflow-hidden min-h-[400px]">
      <div className="relative mb-8">
        <h3 className="pr-10 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
          Métricas de Rendimiento
        </h3>

        <div className="group absolute right-0 top-0">
          <button
            type="button"
            aria-label="Información sobre las métricas de rendimiento"
            className="flex h-7 w-7 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-600/70"
          >
            <Info size={11} strokeWidth={3} />
          </button>
          <div className="invisible absolute right-0 top-9 z-[10000] w-72 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[11px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            <div className="mb-2 font-bold text-white uppercase tracking-widest text-[9px]">Datos Técnicos Crudos</div>
            <p>Resultados extraídos directamente del hardware. Las barras reflejan la posición del componente frente al techo teórico actual de tu configuración.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-6">
        {metrics.map((metric) => {
          const percentage = getMetricPercentage(metric);

          return (
            <div key={metric.id} className="flex flex-col gap-2 w-full group">
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                  {metric.label}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-black text-white tracking-tighter">
                    {metric.value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] font-bold text-zinc-700 uppercase">
                    {metric.unit}
                  </span>
                </div>
              </div>

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

      <div className="mt-8 pt-4 border-t border-zinc-900/20">
        <p className="text-[9px] font-bold uppercase tracking-widest leading-tight text-zinc-500 text-center lg:text-left">
          * Valores normalizados bajo entornos estables y techos globales de laboratorio.
        </p>
      </div>
    </div>
  );
}
