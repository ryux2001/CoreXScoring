/**
 * CPU POTENCY SCORE CALCULATOR
 * Calcula la potencia real del CPU basada en benchmarks y specs
 */

import { CPU_CONFIG } from '../../config/cpu';
import { kbToMb } from '../../../shared/helpers';
import { safeExtract } from '../../../shared/validators';
import {
  clampScore,
  getCpuArchitectureProfile,
  getCpuData,
  getFiniteNumber,
  normalizeCpuField,
} from './score-utils';

export const calculatePotencyScore = (product: any): number => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  // Extraer benchmarks
  const cinebench = safeExtract(benchmarks?.cinebench_multi, 0);
  const geekbench = safeExtract(benchmarks?.geekbench_single, 0);
  const passmark = safeExtract(benchmarks?.passmark_score, 0);
  
  // Calcular puntos de benchmarks
  const cinebenchPoints = Math.min(cinebench, CPU_CONFIG.MAX_VALUES.cinebench) * 
    (CPU_CONFIG.WEIGHTS.cinebench / CPU_CONFIG.MAX_VALUES.cinebench);
  
  const geekbenchPoints = Math.min(geekbench, CPU_CONFIG.MAX_VALUES.geekbench) * 
    (CPU_CONFIG.WEIGHTS.geekbench / CPU_CONFIG.MAX_VALUES.geekbench);
  
  const passmarkPoints = Math.min(passmark, CPU_CONFIG.MAX_VALUES.passmark) * 
    (CPU_CONFIG.WEIGHTS.passmark / CPU_CONFIG.MAX_VALUES.passmark);
  
  const benchmarkTotal = cinebenchPoints + geekbenchPoints + passmarkPoints;
  
  // Extraer specs
  const turbo = safeExtract(specs?.turbo_frequency, 0);
  const threads = parseInt(specs?.threads || '0', 10);
  const cacheMB = kbToMb(safeExtract(specs?.cache?.l3, 0));
  
  // Calcular puntos de specs
  const turboPoints = Math.min(turbo, CPU_CONFIG.MAX_VALUES_SPECS.turbo) * 
    (CPU_CONFIG.WEIGHTS_SPECS.turbo / CPU_CONFIG.MAX_VALUES_SPECS.turbo);
  
  const threadsPoints = Math.min(threads, CPU_CONFIG.MAX_VALUES_SPECS.threads) * 
    (CPU_CONFIG.WEIGHTS_SPECS.threads / CPU_CONFIG.MAX_VALUES_SPECS.threads);
  
  const cachePoints = Math.min(cacheMB, CPU_CONFIG.MAX_VALUES_SPECS.cache) * 
    (CPU_CONFIG.WEIGHTS_SPECS.cache / CPU_CONFIG.MAX_VALUES_SPECS.cache);
  
  const specsTotal = turboPoints + threadsPoints + cachePoints;
  
  // Total puntos y nota final
  const totalPoints = benchmarkTotal + specsTotal;
  
  return Math.min(10, (totalPoints / CPU_CONFIG.MAX_POINTS) * 10);
};

/**
 * Potency v3 combines multi-core throughput with a corrected single-core
 * potential. Geekbench has mixed scales in the catalogue, so architecture and
 * boost frequency stabilize that signal instead of letting one raw value move
 * an entire generation.
 */
export const calculatePotencyV3Score = (product: any): number => {
  const { benchmarks, specs } = getCpuData(product);
  const architecture = getCpuArchitectureProfile(product);
  const geekbench = normalizeCpuField(
    getFiniteNumber(benchmarks.geekbench_single) ?? 0,
    'GEEKBENCH_SINGLE',
  );
  const cinebench = normalizeCpuField(
    getFiniteNumber(benchmarks.cinebench_multi) ?? 0,
    'CINEBENCH_MULTI',
  );
  const passmark = normalizeCpuField(
    getFiniteNumber(benchmarks.passmark_score) ?? 0,
    'PASSMARK',
  );
  const turbo = normalizeCpuField(
    getFiniteNumber(specs.turbo_frequency) ?? 0,
    'TURBO',
  );
  const singlePotential =
    geekbench * 0.1 + architecture.ipc * 0.5 + turbo * 0.4;

  return clampScore(
    singlePotential * 0.3 + cinebench * 0.4 + passmark * 0.3,
  );
};

