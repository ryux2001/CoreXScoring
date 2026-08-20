/**
 * CPU QUALITY-PRICE SCORE CALCULATOR
 *
 * The five visible technical notes determine a profile-specific fair price.
 * Comparing that common reference with the evaluated price keeps CPUs ordered
 * by technical utility at equal prices, independently of each SKU's MSRP.
 */

import type { CpuTechnicalNotes } from '../../types';
import {
  CPU_VALUE_FAIR_PRICE_MODELS,
  CPU_VALUE_WEIGHTS,
  type CpuValueProfile,
} from './profiles';
import { clampScore, getFiniteNumber } from './score-utils';
import { scoreFromFairPrice } from '../value-curve';

export function getCpuValueUtility(
  notes: CpuTechnicalNotes,
  profile: CpuValueProfile = 'balanced',
): number {
  const weights = CPU_VALUE_WEIGHTS[profile];
  const potency = clampScore(getFiniteNumber(notes['Potencia']) ?? 0);
  const productivity = clampScore(getFiniteNumber(notes['Productividad']) ?? 0);
  const gaming = clampScore(getFiniteNumber(notes.Gaming) ?? 0);
  const efficiency = clampScore(getFiniteNumber(notes['Eficiencia']) ?? 0);
  const platform = clampScore(getFiniteNumber(notes['Plataforma']) ?? 0);

  return clampScore(
    potency * weights.potency +
      productivity * weights.productivity +
      gaming * weights.gaming +
      efficiency * weights.efficiency +
      platform * weights.platform,
  );
}

export function getCpuFairPrice(
  notes: CpuTechnicalNotes,
  profile: CpuValueProfile = 'balanced',
): number {
  const utility = getCpuValueUtility(notes, profile);
  if (utility <= 0) return 0;

  const model = CPU_VALUE_FAIR_PRICE_MODELS[profile];
  const fairPrice = Math.exp(model.intercept + model.utilitySlope * utility);
  return Number.isFinite(fairPrice) && fairPrice > 0 ? fairPrice : 0;
}

export const calculateValueScore = (
  notes: CpuTechnicalNotes,
  evaluatedPrice: number,
  _product?: unknown,
  profile: CpuValueProfile = 'balanced',
): number => {
  const price = getFiniteNumber(evaluatedPrice);
  if (price === null || price <= 0) return 0;

  const fairPrice = getCpuFairPrice(notes, profile);
  if (fairPrice <= 0) return 0;

  return clampScore(scoreFromFairPrice(price, fairPrice));
};
