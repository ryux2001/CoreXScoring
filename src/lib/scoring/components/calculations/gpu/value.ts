/**
 * GPU VALUE SCORE CALCULATOR
 * v2 separates the MSRP baseline from the adjustment for the real price.
 */

import {
  GPU_VALUE_WEIGHTS,
  type GpuEvaluationNotes,
  type GpuValueProfile,
} from './profiles';
import { clampScore, getFiniteNumber, parseJsonRecord } from './score-utils';

export type GpuPriceSegment = 'entry' | 'mid' | 'upperMid' | 'high' | 'enthusiast';

// Bootstrap value for the current catalog until per-profile/segment medians
// are stored in gpu_value_references.
const DEFAULT_REFERENCE_RATIO = 0.0135;

export function getGpuPriceSegment(msrp: number): GpuPriceSegment {
  if (msrp <= 349) return 'entry';
  if (msrp <= 499) return 'mid';
  if (msrp <= 699) return 'upperMid';
  if (msrp <= 1199) return 'high';
  return 'enthusiast';
}

function getReferenceRatio(
  product: any,
  profile: GpuValueProfile,
  segment: GpuPriceSegment,
): number {
  const references = parseJsonRecord(product?.gpu_value_references);
  const profileReferences = parseJsonRecord(references[profile]);
  const segmentReference = getFiniteNumber(profileReferences[segment]);
  if (segmentReference !== null && segmentReference > 0) return segmentReference;

  const profileRatios = parseJsonRecord(product?.gpu_value_reference_ratios);
  const profileRatio = getFiniteNumber(profileRatios[profile]);
  if (profileRatio !== null && profileRatio > 0) return profileRatio;

  const directRatio = getFiniteNumber(product?.[`gpu_value_reference_ratio_${profile}`]);
  return directRatio !== null && directRatio > 0 ? directRatio : DEFAULT_REFERENCE_RATIO;
}

function clampBetween(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const calculateValueScore = (
  notes: GpuEvaluationNotes,
  evaluatedPrice: number,
  product: any,
  profile: GpuValueProfile = 'balanced',
): number => {
  const msrp = getFiniteNumber(product?.price_base_usd) ?? 0;
  if (msrp <= 0 || !Number.isFinite(evaluatedPrice) || evaluatedPrice <= 0) return 0;

  const weights = GPU_VALUE_WEIGHTS[profile];
  const usageIndex =
    notes.rasterization * weights.rasterization +
    notes.rayTracing * weights.rayTracing +
    notes.productivity * weights.productivity +
    notes.memory * weights.memory +
    notes.efficiency * weights.efficiency +
    notes.software * weights.software;

  const segment = getGpuPriceSegment(msrp);
  const referenceRatio = getReferenceRatio(product, profile, segment);
  const ratio = usageIndex / msrp;
  const cpAtMsrp = clampBetween(5.5 + 5 * Math.log(ratio / referenceRatio), 2, 8);
  const priceAdjustment = 14 * Math.log(msrp / evaluatedPrice);

  return clampScore(cpAtMsrp + priceAdjustment);
};
