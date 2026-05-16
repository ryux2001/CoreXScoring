/**
 * GPU EFFICIENCY SCORE CALCULATOR
 */

import { GPU_CONFIG } from '../../config/gpu';
import { safeExtract } from '../../utils/validators';

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

export const calculateEfficiencyScore = (product: any): number => {
  // CORRECCIÓN: Parsear de forma segura los objetos JSONB de Supabase
  const benchmarks = parseJsonbString(product?.benchmarks || '{}');
  const specs = parseJsonbString(product?.specs || '{}');
  
  // Extraer benchmarks y specs
  const timeSpy = safeExtract(benchmarks?.['3dmark_time_spy'], 0);
  const tdp = safeExtract(specs?.tdp, 0);
  
  // 1. Rendimiento por vatio (7000 pts)
  const ratio = tdp > 0 ? timeSpy / tdp : 0;
  const ratioPoints = Math.min(ratio, GPU_CONFIG.EFICIENCIA.RATIO.MAX_RATIO) * (GPU_CONFIG.EFICIENCIA.RATIO.POINTS / GPU_CONFIG.EFICIENCIA.RATIO.MAX_RATIO);
  
  // 2. Huella térmica (3000 pts)
  // Fórmula: ((600 - TDP) / 450) * 3000, con máximo de 3000 y mínimo de 0
  let footprintPoints = 0;
  if (tdp <= GPU_CONFIG.EFICIENCIA.FOOTPRINT.MIN_WATTAGE) {
    footprintPoints = GPU_CONFIG.EFICIENCIA.FOOTPRINT.POINTS;
  } else if (tdp >= GPU_CONFIG.EFICIENCIA.FOOTPRINT.MAX_WATTAGE) {
    footprintPoints = 0;
  } else {
    footprintPoints = ((GPU_CONFIG.EFICIENCIA.FOOTPRINT.MAX_WATTAGE - tdp) / GPU_CONFIG.EFICIENCIA.FOOTPRINT.PENALTY_FACTOR) * GPU_CONFIG.EFICIENCIA.FOOTPRINT.POINTS;
    // CORRECCIÓN: Clampear matemáticamente para que gráficas de muy bajo consumo no desborden los 3000 pts máximos
    footprintPoints = Math.min(GPU_CONFIG.EFICIENCIA.FOOTPRINT.POINTS, Math.max(0, footprintPoints));
  }
  
  // Total puntos
  const totalPoints = ratioPoints + footprintPoints;
  
  return Math.min(10, (totalPoints / GPU_CONFIG.EFICIENCIA.TOTAL_POINTS) * 10);
};