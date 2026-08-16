/**
 * GPU RAY TRACING SCORE CALCULATOR
 * Uses only the 3DMark Port Royal benchmark.
 */

import { safeExtract } from '../../../shared/validators';
import {
  clampScore,
  getFiniteNumber,
  getGpuData,
  getGpuArchitectureFamily,
  interpolateScore,
  normalizeGpuScoreFromConfig,
} from './score-utils';
import { GPU_CAPABILITY_PROFILES, GPU_SCORING_V3 } from './v3-config';
import { calculateRasterizationV3Score } from './potency';
import { calculateVramAdequacyScore } from './memory';

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

/**
 * Ray Tracing v3 uses Port Royal only because it is present for every GPU in
 * the current catalogue. Speed Way remains an optional diagnostic benchmark
 * until it has complete coverage.
 */
export const calculateRayTracingV3Score = (product: any): number => {
  const { benchmarks } = getGpuData(product);
  const portRoyal = getFiniteNumber(benchmarks['3dmark_port_royal']) ?? 0;

  return normalizeGpuScoreFromConfig(portRoyal, 'RAY_TRACING');
};

/**
 * Gaming v3 combines native raster, RT, VRAM headroom and gaming features.
 * The feature profile is intentionally a small contribution so synthetic
 * frame-generation claims cannot outweigh native rendering performance.
 */
export const calculateGamingV3Score = (product: any): number => {
  const architecture = getGpuArchitectureFamily(product);
  const profile = GPU_CAPABILITY_PROFILES[architecture];
  const weights = GPU_SCORING_V3.WEIGHTS.GAMING;
  const rasterization = calculateRasterizationV3Score(product);
  const rayTracing = calculateRayTracingV3Score(product);
  const vram = calculateVramAdequacyScore(product);

  return clampScore(
    rasterization * weights.rasterization +
      rayTracing * weights.rayTracing +
      vram * weights.vram +
      profile.gamingTechnology * weights.technology,
  );
};

// Public GPU gaming alias now points to the composite v3 note. The legacy
// Ray Tracing-only function remains available under its explicit name.
export const calculateGamingScore = calculateGamingV3Score;
