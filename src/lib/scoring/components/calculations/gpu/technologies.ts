/**
 * GPU SOFTWARE AND ECOSYSTEM SCORE CALCULATOR
 * v2 uses the current technologies/description data and gradual blocks.
 */

import { includesAnyGpuKeyword } from '../../../shared/keyword-matching';
import {
  clampScore,
  getFeatureScore,
  getFiniteNumber,
  getGpuData,
  getGpuFeatureText,
  getGpuTechnologyText,
} from './score-utils';

function calculateScalingGenerationScore(searchText: string, features: Record<string, unknown>): number {
  const structuredScore = getFeatureScore(features, 'scaling_generation_score');
  if (structuredScore !== null) return structuredScore;

  if (includesAnyGpuKeyword(searchText, ['dlss4', 'dlss 4'])) return 10;
  if (includesAnyGpuKeyword(searchText, ['fsr4', 'fsr 4'])) return 8;
  if (includesAnyGpuKeyword(searchText, ['dlss3', 'dlss 3', 'fsr3', 'fsr 3'])) return 7;
  if (includesAnyGpuKeyword(searchText, ['dlss', 'fsr'])) return 4;
  return 0;
}

function calculateAiHardwareScore(
  product: any,
  searchText: string,
  features: Record<string, unknown>,
): number {
  const structuredScore = getFeatureScore(features, 'ai_hardware_score');
  if (structuredScore !== null) return structuredScore;

  const brand = String(product?.brand ?? '').toUpperCase();
  const hasAiSignal = includesAnyGpuKeyword(searchText, [
    'tensor',
    'ia',
    'ai',
    'machine learning',
    'redes neuronales',
    'neural networks',
    'rocm',
    'hip',
  ]);

  if (brand === 'NVIDIA' && hasAiSignal) return 10;
  if (brand === 'AMD' && hasAiSignal) return 6;
  return 0;
}

function calculateAdvancedRayTracingScore(
  searchText: string,
  benchmarks: Record<string, unknown>,
  features: Record<string, unknown>,
): number {
  const structuredScore = getFeatureScore(features, 'ray_tracing_advanced_score');
  if (structuredScore !== null) return structuredScore;

  if (includesAnyGpuKeyword(searchText, ['ray reconstruction', 'path tracing', 'regeneracion de rayos'])) return 10;
  if ((getFiniteNumber(benchmarks['3dmark_speed_way']) ?? 0) > 0) return 7;
  if (includesAnyGpuKeyword(searchText, ['ray tracing', 'trazado de rayos'])) return 5;
  return 0;
}

function calculateLatencyMediaCodecScore(searchText: string, features: Record<string, unknown>): number {
  const structuredScore = getFeatureScore(features, 'latency_media_codecs_score');
  if (structuredScore !== null) return structuredScore;

  const hasReflex = includesAnyGpuKeyword(searchText, ['reflex']);
  const hasAntiLag = includesAnyGpuKeyword(searchText, ['anti lag', 'antilag', 'baja latencia', 'low latency']);
  const hasGoodEncoder = includesAnyGpuKeyword(searchText, ['av1', 'nvenc', 'amf', 'hevc']);

  if (hasReflex && hasGoodEncoder) return 10;
  if (hasAntiLag && hasGoodEncoder) return 8;
  if (hasGoodEncoder) return 5;
  return 0;
}

function calculateEcosystemMaturityScore(
  product: any,
  specs: Record<string, unknown>,
  features: Record<string, unknown>,
): number {
  const explicitScores = [
    getFeatureScore(features, 'driver_maturity_score'),
    getFeatureScore(features, 'game_support_score'),
    getFeatureScore(features, 'creator_support_score'),
  ].filter((score): score is number => score !== null);

  if (explicitScores.length > 0) {
    return explicitScores.reduce((total, score) => total + score, 0) / explicitScores.length;
  }

  const brand = String(product?.brand ?? '').toUpperCase();
  const name = String(product?.name ?? '').toUpperCase();
  const architecture = String(specs.architecture ?? '').toUpperCase();

  if (brand === 'NVIDIA' && (name.includes('RTX 50') || architecture.includes('BLACKWELL'))) return 9.5;
  if (brand === 'AMD' && (name.includes('RX 9') || architecture.includes('RDNA 4'))) return 7;
  return 5;
}

export const calculateTechnologiesScore = (product: any): number => {
  const { benchmarks, specs, features } = getGpuData(product);
  const searchText = `${getGpuTechnologyText(product?.technologies, product?.description)} ${getGpuFeatureText(features)}`;

  const scalingGenerationScore = calculateScalingGenerationScore(searchText, features);
  const aiHardwareScore = calculateAiHardwareScore(product, searchText, features);
  const advancedRayTracingScore = calculateAdvancedRayTracingScore(searchText, benchmarks, features);
  const latencyMediaCodecScore = calculateLatencyMediaCodecScore(searchText, features);
  const ecosystemMaturityScore = calculateEcosystemMaturityScore(product, specs, features);

  return clampScore(
    scalingGenerationScore * 0.3 +
      aiHardwareScore * 0.2 +
      advancedRayTracingScore * 0.2 +
      latencyMediaCodecScore * 0.15 +
      ecosystemMaturityScore * 0.15,
  );
};
