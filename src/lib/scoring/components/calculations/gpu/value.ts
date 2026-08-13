/**
 * GPU VALUE SCORE CALCULATOR
 * Uses a smooth value curve and a user-selected usage profile.
 */

import {
  GPU_VALUE_WEIGHTS,
  type GpuEvaluationNotes,
  type GpuValueProfile,
} from './profiles';
import { clampScore } from './score-utils';

export const calculateValueScore = (
  notes: GpuEvaluationNotes,
  evaluatedPrice: number,
  product: any,
  profile: GpuValueProfile = 'balanced',
): number => {
  void product;

  if (!Number.isFinite(evaluatedPrice) || evaluatedPrice <= 0) return 0;

  const weights = GPU_VALUE_WEIGHTS[profile];
  const usageIndex =
    notes.rasterization * weights.rasterization +
    notes.rayTracing * weights.rayTracing +
    notes.productivity * weights.productivity +
    notes.memory * weights.memory +
    notes.efficiency * weights.efficiency +
    notes.software * weights.software;

  const ratio = usageIndex / evaluatedPrice;
  const referenceRatio = 0.012;
  const valueScore = 10 * (ratio / (ratio + referenceRatio));

  return clampScore(valueScore);
};
