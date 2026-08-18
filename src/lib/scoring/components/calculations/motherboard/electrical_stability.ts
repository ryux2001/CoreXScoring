/**
 * MOTHERBOARD ELECTRICAL STABILITY SCORE CALCULATOR
 *
 * VRM quality and thermal behavior lead the score; phase count is useful only
 * with diminishing returns and is taken from the CPU/core phase group.
 */

import { MOTHERBOARD_CONFIG } from '../../config/motherboard';
import {
  finiteNumber,
  getSpecs,
  getTechnologyText,
  getThermalScore,
  interpolate,
  score10,
} from './normalization';

export const calculateElectricalStabilityScore = (product: any): number => {
  const specs = getSpecs(product);
  const quality = Math.max(0, Math.min(10, finiteNumber(specs.vrm_quality_rating, 6)));
  const phaseCount = finiteNumber(String(specs.power_phases ?? '').match(/\d+/)?.[0], finiteNumber(specs.vrm_phases, 0));
  const phaseScore = interpolate(phaseCount, MOTHERBOARD_CONFIG.ESTABILIDAD.CPU_PHASE_ANCHORS);
  const technologyText = getTechnologyText(product);
  const amperage = Math.max(
    0,
    ...[...technologyText.matchAll(/(\d{2,3})\s*a\b/g)].map((match) => finiteNumber(match[1], 0)),
  );
  const architectureScore = interpolate(amperage, MOTHERBOARD_CONFIG.ESTABILIDAD.ARCHITECTURE_ANCHORS);
  const weights = MOTHERBOARD_CONFIG.ESTABILIDAD.WEIGHTS;

  return score10(
    quality * weights.VRM_QUALITY +
    getThermalScore(product) * weights.THERMAL +
    phaseScore * weights.CPU_PHASES +
    architectureScore * weights.ARCHITECTURE,
  );
};
