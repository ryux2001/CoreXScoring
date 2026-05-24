"use client";

import React from 'react';
import { Info } from 'lucide-react';

// Importamos tus configuraciones reales de tu carpeta config
import { CPU_CONFIG } from '@/lib/scoring/config/cpu';
import { GPU_CONFIG } from '@/lib/scoring/config/gpu';
import { RAM_CONFIG } from '@/lib/scoring/config/ram';
import { STORAGE_CONFIG } from '@/lib/scoring/config/storage';
import { MOTHERBOARD_CONFIG } from '@/lib/scoring/config/motherboard';
import { PSU_CONFIG } from '@/lib/scoring/config/psu';

interface BenchmarksCardProps {
  product: any;
}

export default function BenchmarksCard({ product }: BenchmarksCardProps) {
  const type = product?.type?.toUpperCase() || 'CPU';

  // Estructura de benchmarks adaptada 100% a tus archivos de configuración
  const getBenchmarksData = () => {
    switch (type) {
      case 'CPU':
        return [
          { label: 'Cinebench R23 (Multi-Core)', unit: 'pts', max: CPU_CONFIG.MAX_VALUES.cinebench, mockValue: 28500 },
          { label: 'Geekbench (Single-Core)', unit: 'pts', max: CPU_CONFIG.MAX_VALUES.geekbench, mockValue: 2450 },
          { label: 'PassMark CPU Mark', unit: 'pts', max: CPU_CONFIG.MAX_VALUES.passmark, mockValue: 43500 },
        ];
      case 'GPU':
        return [
          { label: '3DMark Time Spy Score', unit: 'pts', max: GPU_CONFIG.POTENCIA.BENCHMARKS.MAX_VALUES.timeSpy, mockValue: 18400 },
          { label: '3DMark Port Royal (Ray Tracing)', unit: 'pts', max: GPU_CONFIG.POTENCIA.BENCHMARKS.MAX_VALUES.portRoyal, mockValue: 9200 },
          { label: 'Capacidad de VRAM', unit: 'GB', max: GPU_CONFIG.POTENCIA.VRAM.MAX_VALUES.capacity, mockValue: product?.vram_capacity || 16 },
        ];
      case 'RAM':
        return [
          { label: 'Frecuencia del Módulo', unit: 'MHz', max: RAM_CONFIG.VELOCIDAD.FRECUENCIA.MAX_MHZ, mockValue: 6000 },
          { label: 'Ancho de Banda Teórico', unit: 'GB/s', max: RAM_CONFIG.VELOCIDAD.ANCHO_BANDA.MAX_GBPS, mockValue: 76 },
          { 
            label: 'Latencia Cruda Real', 
            unit: 'ns', 
            max: RAM_CONFIG.LATENCIA.REAL.MIN_NS, // 100ns (peor caso)
            min: RAM_CONFIG.LATENCIA.REAL.MAX_NS, // 45ns (mejor caso)
            mockValue: 64, 
            invert: true 
          },
        ];
      case 'STORAGE':
        return [
          { label: 'Velocidad de Lectura (Máx)', unit: 'MB/s', max: STORAGE_CONFIG.VELOCIDAD.TEORICA.READ_MAX, mockValue: 7400 },
          { label: 'Velocidad de Escritura (Máx)', unit: 'MB/s', max: STORAGE_CONFIG.VELOCIDAD.TEORICA.WRITE_MAX, mockValue: 6500 },
        ];
      case 'MOTHERBOARD':
        return [
          { label: 'Fases de Alimentación VRM', unit: 'Fases', max: MOTHERBOARD_CONFIG.ESTABILIDAD.FASES.MAX_PHASES, mockValue: 16 },
          { label: 'Calidad de Construcción', unit: '/10', max: MOTHERBOARD_CONFIG.ESTABILIDAD.CALIDAD.MAX_RATING, mockValue: 8 },
        ];
      case 'PSU':
        return [
          { 
            label: 'Rizo Eléctrico (Línea 12V)', 
            unit: 'mV', 
            max: PSU_CONFIG.ESTABILIDAD.RIZADO.WORST_MV,   // 80mV (peor caso)
            min: PSU_CONFIG.ESTABILIDAD.RIZADO.PERFECT_MV, // 15mV (mejor caso)
            mockValue: 28, 
            invert: true 
          },
          { label: 'Carga Máxima Soportada', unit: 'W', max: 1500, mockValue: product?.watts || 850 },
        ];
      default:
        return [];
    }
  };

  const benchmarks = getBenchmarksData();

  return (
    <div className="flex flex-col p-6 lg:p-8 rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-xl h-full justify-between overflow-hidden min-h-[400px]">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
          Métricas de Rendimiento
        </h3>
        
        <div className="group relative">
          <div className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:text-white">
            <Info size={11} strokeWidth={3} />
          </div>
          <div className="invisible absolute right-0 top-7 z-[10000] w-72 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[11px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
            <div className="mb-2 font-bold text-white uppercase tracking-widest text-[9px]">Datos Técnicos Crudos</div>
            <p>Resultados extraídos directamente del hardware. Las barras reflejan la posición del componente frente al techo teórico actual de tu configuración.</p>
          </div>
        </div>
      </div>

      {/* CUERPO: LISTA DE BARRAS DE PROGRESO */}
      <div className="flex-1 flex flex-col justify-center space-y-6">
        {benchmarks.map((bench, idx) => {
          let percentage = 0;

          if (bench.invert && bench.min !== undefined) {
            // Lógica inversa avanzada: (PeorCaso - ValorActual) / (PeorCaso - MejorCaso)
            // Esto asegura que si estás cerca del mínimo (ej: 15mV o 45ns), la barra se llene al 100%
            const range = bench.max - bench.min;
            percentage = ((bench.max - bench.mockValue) / range) * 100;
          } else {
            // Lógica estándar lineal
            percentage = (bench.mockValue / bench.max) * 100;
          }

          // Forzamos límites seguros entre 0 y 100
          percentage = Math.max(0, Math.min(100, percentage));

          return (
            <div key={idx} className="flex flex-col gap-2 w-full group">
              
              {/* Fila superior: Nombre + Valor Crudo con Unidad */}
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                  {bench.label}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-black text-white tracking-tighter">
                    {bench.mockValue.toLocaleString('es-ES')}
                  </span>
                  <span className="text-[9px] font-bold text-zinc-700 uppercase">
                    {bench.unit}
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
        <p className="text-[8px] text-zinc-700 uppercase tracking-widest leading-tight text-center lg:text-left">
          * Valores normalizados bajo entornos estables y techos globales de laboratorio.
        </p>
      </div>

    </div>
  );
}