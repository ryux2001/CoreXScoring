/**
 * GPU EFFICIENCY SCORE CALCULATOR
 * Measures Time Spy performance per watt without a second TDP penalty.
 */

import { safeExtract } from '../../../shared/validators';
import { getFiniteNumber, getGpuData, interpolateScore, normalizeGpuScoreFromConfig } from './score-utils';
import { calculateRasterizationScore } from './potency';

const PERFORMANCE_PER_WATT_ANCHORS = [
  [20, 1],
  [30, 3],
  [50, 5],
  [70, 7],
  [90, 8.5],
  [120, 10],
] as const;

export const calculateEfficiencyScore = (product: any): number => {
  const { benchmarks, specs } = getGpuData(product);
  const timeSpy = safeExtract(benchmarks['3dmark_time_spy'], 0);
  const tdp = safeExtract(specs.tdp, 0);

  if (tdp <= 0) return 0;

  const performancePerWatt = tdp > 0 ? timeSpy / tdp : 0;
  const performancePerWattScore = interpolateScore(performancePerWatt, PERFORMANCE_PER_WATT_ANCHORS);
  const rasterizationScore = calculateRasterizationScore(product);

  return performancePerWattScore * 0.65 + rasterizationScore * 0.35;
};

/**
 * Efficiency v3 is performance delivered per catalogue watt. The numerator
 * already contains performance, so adding a second absolute-performance
 * bonus would make high-end cards look efficient despite worse perf/W.
 */
export const calculateEfficiencyV3Score = (product: any): number => {
  const { benchmarks, specs } = getGpuData(product);
  const timeSpy = getFiniteNumber(benchmarks['3dmark_time_spy']) ?? 0;
  const tdp = getFiniteNumber(specs.tdp) ?? 0;

  if (timeSpy <= 0 || tdp <= 0) return 0;

  return normalizeGpuScoreFromConfig(timeSpy / tdp, 'EFFICIENCY');
};
