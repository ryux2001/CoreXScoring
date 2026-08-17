/**
 * CPU QUALITY-PRICE SCORE CALCULATOR
 *
 * The score is based on the five visible v3 technical notes and the price at
 * which the CPU is being evaluated. A fixed catalogue reference and a smooth
 * logistic curve keep scores comparable when new products are added.
 */

import type { CpuTechnicalNotes } from '../../types';
import {
  CPU_VALUE_LOGISTIC_EXPONENT,
  CPU_VALUE_REFERENCE_RATIOS,
  CPU_VALUE_WEIGHTS,
  type CpuValueProfile,
} from './profiles';
import { clampScore, getFiniteNumber } from './score-utils';

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

export const calculateValueScore = (
  notes: CpuTechnicalNotes,
  evaluatedPrice: number,
  product?: any,
  profile: CpuValueProfile = 'balanced',
): number => {
  const selectedPrice = getFiniteNumber(evaluatedPrice);
  const fallbackMsrp = getFiniteNumber(product?.price_base_usd);
  const price = selectedPrice !== null && selectedPrice > 0
    ? selectedPrice
    : fallbackMsrp;

  if (price === null || price <= 0) return 0;

  const utility = getCpuValueUtility(notes, profile);
  if (utility <= 0) return 0;

  const referenceRatio = CPU_VALUE_REFERENCE_RATIOS[profile];
  const valueRatio = utility / price;
  const relativeRatio = valueRatio / referenceRatio;

  if (!Number.isFinite(relativeRatio) || relativeRatio <= 0) return 0;

  const poweredRatio = Math.pow(relativeRatio, CPU_VALUE_LOGISTIC_EXPONENT);

  return clampScore(10 * poweredRatio / (1 + poweredRatio));
};
