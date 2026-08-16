/**
 * GPU EFFICIENCY SCORE CALCULATOR
 * Measures Time Spy performance per watt without a second TDP penalty.
 */

import { safeExtract } from '../../../shared/validators';
import { getGpuData, interpolateScore } from './score-utils';
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
