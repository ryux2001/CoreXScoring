/**
 * CPU EFFICIENCY SCORE CALCULATOR
 * Calcula la nota de eficiencia para CPU
 * Similar estructura a potency.ts
 */

import { CPU_CONFIG } from '../../config/cpu';
import { formatNoteScore, safeExtract } from '../../../shared/helpers';

export const calculateEfficiencyScore = (product: any): number => {
  // Parsear JSONB strings que vienen de Supabase
  const benchmarks = typeof product?.benchmarks === 'string'
    ? JSON.parse(product.benchmarks)
    : product?.benchmarks || {};
  
  const specs = typeof product?.specs === 'string'
    ? JSON.parse(product.specs)
    : product?.specs || {};
  
  // Extraer datos con safeExtract (como potency.ts)
  const cinebench = safeExtract(benchmarks?.cinebench_multi, 0);
  const powerTurboMax = safeExtract(specs?.power_turbo_max, 0);
  
  // 1. Rendimiento por vatio puro (7000 pts)
  const { RATIO: ratioConfig } = CPU_CONFIG.EFFICIENCY;
  const ratio = cinebench / powerTurboMax;
  const ratioPoints = (ratio / ratioConfig.MAX_RATIO) * ratioConfig.POINTS;
  
  // 2. Huella de consumo (3000 pts)
  const { FOOTPRINT: footprintConfig } = CPU_CONFIG.EFFICIENCY;
  const powerTurboMaxFootprint = Math.max(footprintConfig.MIN_WATTAGE, Math.min(footprintConfig.MAX_WATTAGE, powerTurboMax));
  const footprintPoints = ((footprintConfig.MAX_WATTAGE - powerTurboMaxFootprint) / footprintConfig.PENALTY_FACTOR) * footprintConfig.POINTS;
  
  // Total puntos
  const totalPoints = ratioPoints + footprintPoints;
  
  // Escalar a 0-10 (como potency.ts)
  const normalizedScore = (totalPoints / CPU_CONFIG.EFFICIENCY.TOTAL_POINTS) * 10;
  return formatNoteScore(normalizedScore);
};
