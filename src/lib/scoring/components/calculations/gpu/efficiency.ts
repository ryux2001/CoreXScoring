/**
 * GPU EFFICIENCY SCORE CALCULATOR
 * Measures Time Spy performance per watt without a second TDP penalty.
 */

import { safeExtract } from '../../../shared/validators';
import { interpolateScore, parseJsonb } from './score-utils';

const PERFORMANCE_PER_WATT_ANCHORS = [
  [20, 1],
  [30, 3],
  [50, 5],
  [70, 7],
  [90, 8.5],
  [120, 10],
] as const;

export const calculateEfficiencyScore = (product: any): number => {
  const benchmarks = parseJsonb<Record<string, unknown>>(product?.benchmarks, {});
  const specs = parseJsonb<Record<string, unknown>>(product?.specs, {});
  const timeSpy = safeExtract(benchmarks['3dmark_time_spy'], 0);
  const tdp = safeExtract(specs.tdp, 0);
  const performancePerWatt = tdp > 0 ? timeSpy / tdp : 0;

  return interpolateScore(performancePerWatt, PERFORMANCE_PER_WATT_ANCHORS);
};
