/**
 * GPU PRODUCTIVITY SCORE CALCULATOR
 * Blender is the primary signal; professional acceleration is a small bonus.
 */

import { safeExtract } from '../../../shared/validators';
import { includesAnyGpuKeyword } from '../../../shared/keyword-matching';
import { getGpuTechnologyText, interpolateScore, parseJsonb } from './score-utils';

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

export const calculateProductivityScore = (product: any): number => {
  const benchmarks = parseJsonb<Record<string, unknown>>(product?.benchmarks, {});
  const technologyText = getGpuTechnologyText(product?.technologies, product?.description);
  const blenderScore = safeExtract(benchmarks.blender_score, 0);
  const renderingScore = interpolateScore(blenderScore, BLENDER_SCORE_ANCHORS);
  const accelerationScore = includesAnyGpuKeyword(technologyText, [
    'machine learning',
    'redes neuronales',
    'neural networks',
    'tensor',
    'av1',
  ]) ? 10 : 0;

  return renderingScore * 0.85 + accelerationScore * 0.15;
};
