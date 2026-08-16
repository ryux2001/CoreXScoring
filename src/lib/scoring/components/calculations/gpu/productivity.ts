/**
 * GPU PRODUCTIVITY SCORE CALCULATOR
 * v2 uses the fields currently available in the catalog. Structured feature
 * fields can replace the temporary architecture heuristic later.
 */

import { includesAnyGpuKeyword } from '../../../shared/keyword-matching';
import {
  clampScore,
  getFiniteNumber,
  getGpuData,
  getGpuArchitectureFamily,
  getGpuFeatureText,
  getGpuTechnologyText,
  interpolateScore,
  normalizeGpuScoreFromConfig,
} from './score-utils';
import { GPU_CAPABILITY_PROFILES, GPU_SCORING_V3 } from './v3-config';
import { calculateVramAdequacyScore } from './memory';

const BLENDER_SCORE_ANCHORS = [
  [250, 1],
  [500, 2],
  [1000, 3],
  [2000, 4],
  [4000, 5.3],
  [6000, 6.5],
  [9000, 7.6],
  [14000, 9],
  [18000, 10],
] as const;

function calculateProfessionalAccelerationScore(
  product: any,
  searchText: string,
  specs: Record<string, unknown>,
): number {
  const brand = String(product?.brand ?? '').toUpperCase();
  const name = String(product?.name ?? '').toUpperCase();
  const architecture = String(specs.architecture ?? '').toUpperCase();

  let score = 4;

  if (brand === 'NVIDIA' && (architecture.includes('BLACKWELL') || name.includes('RTX 50'))) {
    score = 9.5;
  } else if (brand === 'AMD' && (architecture.includes('RDNA 4') || name.includes('RX 9'))) {
    score = 6.8;
  }

  if (includesAnyGpuKeyword(searchText, ['cuda'])) score += 0.3;
  if (includesAnyGpuKeyword(searchText, ['optix'])) score += 0.3;
  if (includesAnyGpuKeyword(searchText, ['tensor'])) score += 0.2;
  if (includesAnyGpuKeyword(searchText, ['rocm', 'hip'])) score += 0.3;
  if (includesAnyGpuKeyword(searchText, ['av1'])) score += 0.1;

  return clampScore(score);
}

function calculateMediaAiCodecScore(searchText: string): number {
  let score = 0;

  if (includesAnyGpuKeyword(searchText, ['av1'])) score += 2;
  if (includesAnyGpuKeyword(searchText, ['dlss4', 'dlss 4', 'fsr4', 'fsr 4'])) score += 2;
  if (includesAnyGpuKeyword(searchText, ['reflex', 'anti lag', 'antilag', 'baja latencia', 'low latency'])) score += 1.5;
  if (includesAnyGpuKeyword(searchText, ['ray reconstruction', 'regeneracion de rayos'])) score += 2;
  if (includesAnyGpuKeyword(searchText, ['tensor', 'ia', 'ai', 'machine learning', 'redes neuronales', 'neural networks'])) score += 2.5;

  return clampScore(score);
}

export const calculateProductivityScore = (product: any): number => {
  const { benchmarks, specs, features } = getGpuData(product);
  const processingUnits = specs.processing_units && typeof specs.processing_units === 'object'
    ? specs.processing_units as Record<string, unknown>
    : {};
  const structuredSignals = [
    (getFiniteNumber(specs.cuda_cores_stream_processors) ?? 0) > 0 ? 'cuda' : '',
    (getFiniteNumber(processingUnits.tensor_cores) ?? 0) > 0 ? 'tensor' : '',
  ].join(' ');
  const searchText = `${product?.name ?? ''} ${product?.brand ?? ''} ${specs.architecture ?? ''} ${getGpuTechnologyText(product?.technologies, product?.description)} ${getGpuFeatureText(features)} ${structuredSignals}`;
  const blenderScore = getFiniteNumber(benchmarks.blender_score) ?? 0;
  const renderingScore = interpolateScore(blenderScore, BLENDER_SCORE_ANCHORS);
  const professionalAccelerationScore = calculateProfessionalAccelerationScore(product, searchText, specs);
  const mediaAiCodecScore = calculateMediaAiCodecScore(searchText);

  return clampScore(
    renderingScore * 0.5 +
      professionalAccelerationScore * 0.35 +
      mediaAiCodecScore * 0.15,
  );
};

/**
 * Productivity v3 prioritizes the comparable Blender workload, then adds
 * memory headroom and a restrained creator-stack capability component.
 */
export const calculateProductivityV3Score = (product: any): number => {
  const { benchmarks } = getGpuData(product);
  const blenderScore = getFiniteNumber(benchmarks.blender_score) ?? 0;
  const architecture = getGpuArchitectureFamily(product);
  const profile = GPU_CAPABILITY_PROFILES[architecture];
  const weights = GPU_SCORING_V3.WEIGHTS.PRODUCTIVITY;

  return clampScore(
    normalizeGpuScoreFromConfig(blenderScore, 'PRODUCTIVITY') * weights.blender +
      calculateVramAdequacyScore(product) * weights.vram +
      profile.creator * weights.creator,
  );
};
