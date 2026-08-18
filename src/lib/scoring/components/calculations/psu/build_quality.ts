/** PSU construction and thermal implementation score. */

import { PSU_CONFIG } from '../../config/psu';
import {
  finiteNumber,
  getBenchmarks,
  getEvidenceText,
  getRippleScore,
  getTopologyScore,
  interpolate,
  score10,
} from './normalization';

function getComponentScore(text: string): number {
  return /japanese.*(?:capacitor|condens)|(?:capacitor|condens).*japanese|105\s*°?c/.test(text)
    ? PSU_CONFIG.CONSTRUCCION.COMPONENT_SCORE.PREMIUM
    : PSU_CONFIG.CONSTRUCCION.COMPONENT_SCORE.UNKNOWN;
}

function getFanScore(text: string): number {
  if (/fdb|fluid dynamic|hdb|silent wings/.test(text)) {
    return PSU_CONFIG.CONSTRUCCION.FAN_SCORE.PREMIUM;
  }
  if (/zero\s*(?:rpm|fan)|smart zero|hybrid silent/.test(text)) {
    return PSU_CONFIG.CONSTRUCCION.FAN_SCORE.SEMI_PASSIVE;
  }
  if (/thermally controlled|auto[- ]fan|low noise fan|ultra quiet/.test(text)) {
    return PSU_CONFIG.CONSTRUCCION.FAN_SCORE.STANDARD;
  }
  return PSU_CONFIG.CONSTRUCCION.FAN_SCORE.UNKNOWN;
}

function getWarrantyScore(text: string): number {
  if (/10[- ]year warranty/.test(text)) return PSU_CONFIG.CONSTRUCCION.WARRANTY_SCORE.TEN_YEAR;
  if (/5[- ]year warranty/.test(text)) return PSU_CONFIG.CONSTRUCCION.WARRANTY_SCORE.FIVE_YEAR;
  return PSU_CONFIG.CONSTRUCCION.WARRANTY_SCORE.UNKNOWN;
}

export const calculateBuildQualityScore = (product: any): number => {
  const benchmarks = getBenchmarks(product);
  const evidence = getEvidenceText(product);
  const ripple = getRippleScore(product);
  const topology = getTopologyScore(product);
  const rawNoise = finiteNumber(benchmarks.noise_level_db, NaN);
  const hasNoise = Number.isFinite(rawNoise) && rawNoise > 0;
  const noise = hasNoise
    ? interpolate(rawNoise, PSU_CONFIG.CONSTRUCCION.NOISE_ANCHORS)
    : PSU_CONFIG.CONSTRUCCION.MISSING_NOISE_SCORE;
  const thermal = 0.6 * noise + 0.4 * getFanScore(evidence);
  const weights = PSU_CONFIG.CONSTRUCCION.WEIGHTS;
  const score = (
    weights.RIPPLE * ripple.score +
    weights.TOPOLOGY * topology +
    weights.COMPONENTS * getComponentScore(evidence) +
    weights.THERMAL * thermal +
    weights.WARRANTY * getWarrantyScore(evidence)
  );

  return score10(
    ripple.hasData && hasNoise ? score : Math.min(score, 7),
  );
};
