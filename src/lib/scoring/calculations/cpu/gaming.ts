/**
 * CPU GAMING SCORE CALCULATOR
 * Calcula la nota de gaming para CPU
 * Similar estructura a potency.ts
 */

import { CPU_CONFIG } from '../../config/cpu';
import { formatNoteScore, safeExtract } from '../../utils/helpers';

export const calculateGamingScore = (product: any): number => {
  // Parsear JSONB strings que vienen de Supabase
  const benchmarks = typeof product?.benchmarks === 'string'
    ? JSON.parse(product.benchmarks)
    : product?.benchmarks || {};
  
  const specs = typeof product?.specs === 'string'
    ? JSON.parse(product.specs)
    : product?.specs || {};
  
  const compatibility = typeof product?.compatibility === 'string'
    ? JSON.parse(product.compatibility)
    : product?.compatibility || {};
  
  // Extraer datos con safeExtract (como potency.ts)
  const geekbench = safeExtract(benchmarks?.geekbench_single, 0);
  const cores = parseInt(specs?.cores || '0', 10);
  const cacheMB = safeExtract(specs?.cache?.l3, 0) / 1024;  // KB → MB
  const turbo = safeExtract(specs?.turbo_frequency, 0);
  
  // 1. Benchmarks y núcleos (4000 pts)
  const { WEIGHTS: benchmarkWeights, MAX_VALUES: benchmarkMax, CORES_STEPS } = CPU_CONFIG.GAMING.BENCHMARKS_CORES;
  const geekbenchPoints = (geekbench / benchmarkMax.geekbench) * benchmarkWeights.geekbench;
  const coresPoints = getCoresPoints(cores, CORES_STEPS);
  const benchmarksCoresTotal = geekbenchPoints + coresPoints;
  
  // 2. Cache y frecuencias (4000 pts)
  const { WEIGHTS: cacheWeights, MAX_VALUES: cacheMax } = CPU_CONFIG.GAMING.CACHE_FREQUENCY;
  const cachePoints = (cacheMB / cacheMax.cache) * cacheWeights.cache;
  const turboPoints = (turbo / cacheMax.turbo) * cacheWeights.turbo;
  const cacheFrequencyTotal = cachePoints + turboPoints;
  
  // 3. Ancho de banda y plataforma (2000 pts)
  const { RAM_SCORES, PCIE_SCORES } = CPU_CONFIG.GAMING.BANDWIDTH_PLATFORM;
  const ramType = (compatibility?.ram_type || '').toLowerCase();
  const ramScore = getRamScore(ramType, RAM_SCORES);
  
  const pcie = parseInt(compatibility?.pcie, 10);
  const pcieScore = getPcieScore(pcie, PCIE_SCORES);
  
  const bandwidthPlatformTotal = ramScore + pcieScore;
  
  // Total puntos
  const totalPoints = benchmarksCoresTotal + cacheFrequencyTotal + bandwidthPlatformTotal;
  
  // Escalar a 0-10 (como potency.ts)
  const normalizedScore = (totalPoints / CPU_CONFIG.GAMING.TOTAL_POINTS) * 10;
  return formatNoteScore(normalizedScore);
};

/**
 * Helper para núcleos escalonados
 */
function getCoresPoints(cores: number, steps: any): number {
  if (cores > steps.high.threshold) return steps.high.points;
  if (cores === 6) return steps.medium.points;
  if (cores === 4) return steps.low.points;
  return steps.none.points;
}

/**
 * Helper para RAM (similar a getRamScore en technology-extractor.ts)
 */
function getRamScore(ramType: string, scores: any): number {
  if (ramType.includes('ddr5')) return scores.ddr5;
  if (ramType.includes('ddr4')) return scores.ddr4;
  if (ramType.includes('ddr3')) return scores.ddr3;
  return 0;
}

/**
 * Helper para PCIe (similar a getPcieScore en technology-extractor.ts)
 */
function getPcieScore(pcie: number, scores: any): number {
  const key = pcie.toString();
  return scores[key] || 0;
}
