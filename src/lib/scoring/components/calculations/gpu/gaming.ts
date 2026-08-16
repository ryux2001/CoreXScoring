/**
 * GPU RAY TRACING SCORE CALCULATOR
 * Uses only the 3DMark Port Royal benchmark.
 */

import { safeExtract } from '../../../shared/validators';
import {
  clampScore,
  getFiniteNumber,
  getGpuData,
  interpolateScore,
} from './score-utils';

const PORT_ROYAL_SCORE_ANCHORS = [
  [250, 1],
  [500, 2],
  [4000, 3],
  [8000, 4.5],
  [12000, 6],
  [16000, 7.2],
  [22000, 8.5],
  [28000, 9.3],
  [36000, 10],
] as const;

const SPEED_WAY_SCORE_ANCHORS = [
  [1000, 1],
  [2000, 2],
  [3000, 3],
  [4000, 4],
  [5000, 5],
  [6500, 6],
  [8000, 7],
  [10000, 8],
  [12500, 9],
  [15000, 10],
] as const;

export const calculateRayTracingScore = (product: any): number => {
  const { benchmarks } = getGpuData(product);
  const portRoyal = safeExtract(benchmarks['3dmark_port_royal'], 0);
  const portRoyalScore = interpolateScore(portRoyal, PORT_ROYAL_SCORE_ANCHORS);
  const modernScore = getFiniteNumber(benchmarks.path_tracing_score ?? benchmarks.rt_modern_score);
  const speedWay = safeExtract(benchmarks['3dmark_speed_way'], 0);
  const speedWayScore = interpolateScore(speedWay, SPEED_WAY_SCORE_ANCHORS);

  const modernRayTracingScore = modernScore === null
    ? speedWay > 0 ? speedWayScore : null
    : clampScore(modernScore);

  if (modernRayTracingScore === null) return portRoyalScore;

  return clampScore(portRoyalScore * 0.6 + modernRayTracingScore * 0.4);
};

// Compatibility alias for any external import of the previous name.
export const calculateGamingScore = calculateRayTracingScore;
