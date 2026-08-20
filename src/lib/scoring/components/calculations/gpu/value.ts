/**
 * GPU QUALITY-PRICE SCORE CALCULATOR
 *
 * Technical utility determines a profile-specific fair price shared by the
 * category. An individual GPU's MSRP never changes its runtime value score.
 */

import {
  GPU_VALUE_FAIR_PRICE_MODELS,
  GPU_VALUE_WEIGHTS,
  type GpuValueProfile,
} from './profiles';
import { clampScore, getFiniteNumber } from './score-utils';
import type { GpuTechnicalNotes } from '../../types';
import { scoreFromFairPrice } from '../value-curve';

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

export function getGpuFairPrice(
  notes: GpuTechnicalNotes,
  profile: GpuValueProfile = 'balanced',
): number {
  const utility = getGpuValueUtility(notes, profile);
  if (utility <= 0) return 0;

  const model = GPU_VALUE_FAIR_PRICE_MODELS[profile];
  const fairPrice = Math.exp(model.intercept + model.utilitySlope * utility);
  return Number.isFinite(fairPrice) && fairPrice > 0 ? fairPrice : 0;
}

export const calculateValueScore = (
  notes: GpuTechnicalNotes,
  evaluatedPrice: number,
  _product?: unknown,
  profile: GpuValueProfile = 'balanced',
): number => {
  const price = getFiniteNumber(evaluatedPrice);
  if (price === null || price <= 0) return 0;

  const fairPrice = getGpuFairPrice(notes, profile);
  if (fairPrice <= 0) return 0;

  return clampScore(scoreFromFairPrice(price, fairPrice));
};
