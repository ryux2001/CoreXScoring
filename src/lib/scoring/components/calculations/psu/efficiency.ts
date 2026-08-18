/** PSU conversion-efficiency score. */

import { PSU_CONFIG } from '../../config/psu';
import {
  finiteNumber,
  getBenchmarks,
  getSpecs,
  interpolate,
  score10,
} from './normalization';

function getCertificationScore(value: any): number {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('titanium')) return PSU_CONFIG.EFICIENCIA.CERTIFICATION.TITANIUM;
  if (text.includes('platinum')) return PSU_CONFIG.EFICIENCIA.CERTIFICATION.PLATINUM;
  if (text.includes('gold')) return PSU_CONFIG.EFICIENCIA.CERTIFICATION.GOLD;
  if (text.includes('silver')) return PSU_CONFIG.EFICIENCIA.CERTIFICATION.SILVER;
  if (text.includes('bronze')) return PSU_CONFIG.EFICIENCIA.CERTIFICATION.BRONZE;
  if (text.includes('white')) return PSU_CONFIG.EFICIENCIA.CERTIFICATION.WHITE;
  return PSU_CONFIG.EFICIENCIA.CERTIFICATION.UNKNOWN;
}

export const calculateEfficiencyScore = (product: any): number => {
  const specs = getSpecs(product);
  const benchmarks = getBenchmarks(product);
  const rawLoad50 = finiteNumber(benchmarks.efficiency_load_50, NaN);
  const hasMeasuredEfficiency = Number.isFinite(rawLoad50) && rawLoad50 > 0;
  const measured = hasMeasuredEfficiency
    ? interpolate(rawLoad50, PSU_CONFIG.EFICIENCIA.LOAD_50_ANCHORS)
    : PSU_CONFIG.EFICIENCIA.MISSING_MEASURED_SCORE;
  const certification = getCertificationScore(specs.efficiency);
  const weights = PSU_CONFIG.EFICIENCIA.WEIGHTS;
  const score = weights.MEASURED * measured + weights.CERTIFICATION * certification;

  return score10(hasMeasuredEfficiency ? score : Math.min(score, 7.5));
};
