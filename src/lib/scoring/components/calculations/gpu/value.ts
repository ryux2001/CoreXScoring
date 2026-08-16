/**
 * GPU QUALITY-PRICE SCORE CALCULATOR
 *
 * v3 compares the technical utility delivered by the GPU with the price at
 * which it is actually being evaluated. MSRP is only a fallback for callers
 * that do not provide an evaluated price; it is never an independent bonus.
 */

import {
  GPU_VALUE_LOGISTIC_EXPONENT,
  GPU_VALUE_REFERENCE_RATIOS,
  GPU_VALUE_WEIGHTS,
  type GpuValueProfile,
} from './profiles';
import { clampScore, getFiniteNumber } from './score-utils';
import type { GpuTechnicalNotes } from '../../types';

export function getGpuValueUtility(
  notes: GpuTechnicalNotes,
  profile: GpuValueProfile = 'balanced',
): number {
  const weights = GPU_VALUE_WEIGHTS[profile];
  const rasterization = clampScore(getFiniteNumber(notes['Rasterización']) ?? 0);
  const productivity = clampScore(getFiniteNumber(notes['Productividad']) ?? 0);
  const gaming = clampScore(getFiniteNumber(notes.Gaming) ?? 0);
  const efficiency = clampScore(getFiniteNumber(notes['Eficiencia']) ?? 0);
  const technologies = clampScore(getFiniteNumber(notes['Tecnologías']) ?? 0);

  return clampScore(
    rasterization * weights.rasterization +
      productivity * weights.productivity +
      gaming * weights.gaming +
      efficiency * weights.efficiency +
      technologies * weights.technologies,
  );
}

export const calculateValueScore = (
  notes: GpuTechnicalNotes,
  evaluatedPrice: number,
  product?: any,
  profile: GpuValueProfile = 'balanced',
): number => {
  const selectedPrice = getFiniteNumber(evaluatedPrice);
  const fallbackMsrp = getFiniteNumber(product?.price_base_usd);
  const price = selectedPrice !== null && selectedPrice > 0
    ? selectedPrice
    : fallbackMsrp;

  if (price === null || price <= 0) return 0;

  const utility = getGpuValueUtility(notes, profile);
  if (utility <= 0) return 0;

  const referenceRatio = GPU_VALUE_REFERENCE_RATIOS[profile];
  const valueRatio = utility / price;
  const relativeRatio = valueRatio / referenceRatio;

  if (!Number.isFinite(relativeRatio) || relativeRatio <= 0) return 0;

  return clampScore(
    10 / (1 + Math.pow(1 / relativeRatio, GPU_VALUE_LOGISTIC_EXPONENT)),
  );
};
