/**
 * CPU EFFICIENCY SCORE CALCULATOR
 * Calcula la nota de eficiencia para CPU
 * Similar estructura a potency.ts
 */

import { CPU_CONFIG } from '../../config/cpu';
import { formatNoteScore, safeExtract } from '../../../shared/helpers';
import {
  clampScore,
  getCpuData,
  getFiniteNumber,
  interpolateScore,
  normalizeCpuField,
} from './score-utils';
import { CPU_SCORING_V3 } from './v3-config';

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

/**
 * Efficiency v3 balances performance per watt with absolute power footprint.
 * Maximum turbo power is used because TDP definitions differ between vendors.
 */
export const calculateEfficiencyV3Score = (product: any): number => {
  const { benchmarks, specs } = getCpuData(product);
  const cinebench = getFiniteNumber(benchmarks.cinebench_multi) ?? 0;
  const passmark = getFiniteNumber(benchmarks.passmark_score) ?? 0;
  const power = getFiniteNumber(specs.power_turbo_max) ?? 0;

  if (cinebench <= 0 || passmark <= 0 || power <= 0) return 0;

  const cinebenchPerWatt = normalizeCpuField(
    cinebench / power,
    'CINEBENCH_PER_WATT',
  );
  const passmarkPerWatt = normalizeCpuField(
    passmark / power,
    'PASSMARK_PER_WATT',
  );
  const performancePerWatt = cinebenchPerWatt * 0.6 + passmarkPerWatt * 0.4;
  const footprint = interpolateScore(
    power,
    CPU_SCORING_V3.POWER_FOOTPRINT_ANCHORS,
  );

  return clampScore(performancePerWatt * 0.6 + footprint * 0.4);
};
