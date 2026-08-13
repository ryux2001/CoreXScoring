/**
 * GPU POTENCY SCORE CALCULATOR
 * Calcula la potencia real de la GPU basada en benchmarks y specs
 */

import { GPU_CONFIG } from '../../config/gpu';
import { safeExtract } from '../../../shared/validators';

// Función para parsear JSONB strings de Supabase
function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export const calculatePotencyScore = (product: any): number => {
  // Parsear JSONB strings
  const benchmarks = parseJsonbString(product?.benchmarks || '{}');
  const specs = parseJsonbString(product?.specs || '{}');
  
  // Extraer benchmarks
  const timeSpy = safeExtract(benchmarks['3dmark_time_spy'], 0);
  const portRoyal = safeExtract(benchmarks['3dmark_port_royal'], 0);
  const speedWay = safeExtract(benchmarks['3dmark_speed_way'], 0);
  
  // Calcular puntos de benchmarks según el documento
  // Time Spy (4000 pts, techo 50000)
  const timeSpyPoints = Math.min(timeSpy, GPU_CONFIG.POTENCIA.BENCHMARKS.MAX_VALUES.timeSpy) * (GPU_CONFIG.POTENCIA.BENCHMARKS.WEIGHTS.timeSpy / GPU_CONFIG.POTENCIA.BENCHMARKS.MAX_VALUES.timeSpy);
  
  // Port Royal / Speed Way (2000 pts, techo 38000)
  // Usamos el mayor entre Port Royal y Speed Way
  const rayTracingScore = Math.max(portRoyal, speedWay);
  const rayTracingPoints = Math.min(rayTracingScore, GPU_CONFIG.POTENCIA.BENCHMARKS.MAX_VALUES.portRoyal) * (GPU_CONFIG.POTENCIA.BENCHMARKS.WEIGHTS.portRoyal / GPU_CONFIG.POTENCIA.BENCHMARKS.MAX_VALUES.portRoyal);
  
  const benchmarkTotal = timeSpyPoints + rayTracingPoints;
  
  // Extraer specs VRAM
  const vramCapacity = safeExtract(specs.vram_capacity, 0);
  // CORRECCIÓN: Convertir a UPPERCASE para que coincida con 'GDDR7', 'GDDR6X', etc.
  const vramType = specs.vram_type?.toString()?.toUpperCase() || '';
  const busWidth = safeExtract(specs.bus_width, 0);
  
  // Calcular puntos de VRAM
  // Capacidad (1000 pts, techo 32GB)
  const capacityPoints = Math.min(vramCapacity, GPU_CONFIG.POTENCIA.VRAM.MAX_VALUES.capacity) * (GPU_CONFIG.POTENCIA.VRAM.WEIGHTS.capacity / GPU_CONFIG.POTENCIA.VRAM.MAX_VALUES.capacity);
  
  // Tipo de memoria (1000 pts)
  let typePoints = 0;
  if (GPU_CONFIG.POTENCIA.VRAM.TYPE_SCORES.hasOwnProperty(vramType)) {
    typePoints = GPU_CONFIG.POTENCIA.VRAM.TYPE_SCORES[vramType as keyof typeof GPU_CONFIG.POTENCIA.VRAM.TYPE_SCORES];
  }
  
  // Ancho de banda (1000 pts)
  let bandwidthPoints = 0;
  const bandwidthNum = parseFloat(busWidth.toString());
  if (Number.isFinite(bandwidthNum) && bandwidthNum > 0) {
    const bandwidthAnchors = Object.entries(GPU_CONFIG.POTENCIA.VRAM.BANDWIDTH_SCORES)
      .map(([width, points]) => ({ width: Number(width), points }))
      .sort((a, b) => a.width - b.width);

    const firstAnchor = bandwidthAnchors[0];
    const lastAnchor = bandwidthAnchors[bandwidthAnchors.length - 1];

    if (firstAnchor && lastAnchor) {
      if (bandwidthNum <= firstAnchor.width) {
        bandwidthPoints = firstAnchor.points;
      } else if (bandwidthNum >= lastAnchor.width) {
        bandwidthPoints = lastAnchor.points;
      } else {
        const upperIndex = bandwidthAnchors.findIndex((anchor) => bandwidthNum <= anchor.width);
        const lower = bandwidthAnchors[upperIndex - 1];
        const upper = bandwidthAnchors[upperIndex];
        const progress = (bandwidthNum - lower.width) / (upper.width - lower.width);
        bandwidthPoints = lower.points + (upper.points - lower.points) * progress;
      }
    }
  }
  
  const vramTotal = capacityPoints + typePoints + bandwidthPoints;
  
  // Extraer specs chip
  const tflops = safeExtract(specs.tflops_fp32, 0);
  // CORRECCIÓN: Priorizar boost_clock sobre core_clock para mediciones justas
  const clock = safeExtract(specs.boost_clock || specs.core_clock, 0);
  
  // Calcular puntos del chip
  // TFLOPS FP32 (500 pts, techo 100)
  const tflopsPoints = Math.min(tflops, GPU_CONFIG.POTENCIA.CHIP.MAX_VALUES.tflops) * (GPU_CONFIG.POTENCIA.CHIP.WEIGHTS.tflops / GPU_CONFIG.POTENCIA.CHIP.MAX_VALUES.tflops);
  
  // Frecuencia Boost (500 pts, techo 3000MHz)
  const frequencyPoints = Math.min(clock, GPU_CONFIG.POTENCIA.CHIP.MAX_VALUES.frequency) * (GPU_CONFIG.POTENCIA.CHIP.WEIGHTS.frequency / GPU_CONFIG.POTENCIA.CHIP.MAX_VALUES.frequency);
  
  const chipTotal = tflopsPoints + frequencyPoints;
  
  // Total puntos y nota final
  const totalPoints = benchmarkTotal + vramTotal + chipTotal;
  
  return Math.min(10, (totalPoints / GPU_CONFIG.POTENCIA.TOTAL_POINTS) * 10);
};
