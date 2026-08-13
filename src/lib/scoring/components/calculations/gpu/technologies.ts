/**
 * GPU SOFTWARE AND ECOSYSTEM SCORE CALCULATOR
 * Uses structured technology descriptions, never average FPS fields.
 */

import { includesAnyGpuKeyword } from '../../../shared/keyword-matching';
import { clampScore, getGpuTechnologyText } from './score-utils';

export const calculateTechnologiesScore = (product: any): number => {
  const searchText = getGpuTechnologyText(product?.technologies, product?.description);

  const scalingScore = includesAnyGpuKeyword(searchText, [
    'dlss 4',
    'dlss4',
    'fsr 4',
    'fsr4',
  ])
    ? 10
    : includesAnyGpuKeyword(searchText, [
      'frame generation',
      'xess 2',
      'xess 3',
      'fsr 3',
      'fsr3',
      'dlss 3',
      'dlss3',
    ])
      ? 7
      : includesAnyGpuKeyword(searchText, ['fsr', 'xess', 'dlss'])
        ? 4
        : 0;

  const aiScore = includesAnyGpuKeyword(searchText, [
    'tensor',
    'transformer',
    'neural networks',
    'redes neuronales',
    'machine learning',
  ]) ? 10 : 0;

  const rayReconstructionScore = includesAnyGpuKeyword(searchText, [
    'ray reconstruction',
    'path tracing',
    'regeneración de rayos',
  ])
    ? 10
    : includesAnyGpuKeyword(searchText, ['ray tracing', 'trazado de rayos'])
      ? 6
      : 0;

  const ecosystemScore = includesAnyGpuKeyword(searchText, [
    'reflex',
    'anti-lag',
    'low latency',
    'baja latencia',
    'deep link',
    'av1',
  ]) ? 10 : 0;

  return clampScore(
    scalingScore * 0.35 +
      aiScore * 0.2 +
      rayReconstructionScore * 0.25 +
      ecosystemScore * 0.2,
  );
};
