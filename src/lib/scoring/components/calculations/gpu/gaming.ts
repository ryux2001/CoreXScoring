/**
 * GPU RAY TRACING SCORE CALCULATOR
 * Uses only the 3DMark Port Royal benchmark.
 */

import { safeExtract } from '../../../shared/validators';
import { interpolateScore, parseJsonb } from './score-utils';

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

export const calculateRayTracingScore = (product: any): number => {
  const benchmarks = parseJsonb<Record<string, unknown>>(product?.benchmarks, {});
  const portRoyal = safeExtract(benchmarks['3dmark_port_royal'], 0);

  return interpolateScore(portRoyal, PORT_ROYAL_SCORE_ANCHORS);
};

// Compatibility alias for any external import of the previous name.
export const calculateGamingScore = calculateRayTracingScore;
