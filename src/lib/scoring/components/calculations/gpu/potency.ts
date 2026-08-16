/**
 * GPU RASTERIZATION SCORE CALCULATOR
 * Uses only the 3DMark Time Spy benchmark.
 */

import { safeExtract } from '../../../shared/validators';
import { getGpuData, interpolateScore } from './score-utils';

const TIME_SPY_SCORE_ANCHORS = [
  [3000, 1],
  [5000, 2],
  [8000, 3],
  [12000, 4],
  [16000, 5],
  [22000, 6],
  [28000, 7],
  [36000, 8.5],
  [48000, 10],
] as const;

export const calculateRasterizationScore = (product: any): number => {
  const { benchmarks } = getGpuData(product);
  const timeSpy = safeExtract(benchmarks['3dmark_time_spy'], 0);

  return interpolateScore(timeSpy, TIME_SPY_SCORE_ANCHORS);
};

// Compatibility alias for any external import of the previous name.
export const calculatePotencyScore = calculateRasterizationScore;
