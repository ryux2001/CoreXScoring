/** PSU electrical stability score. */

import { PSU_CONFIG } from '../../config/psu';
import { score10, getRippleScore, getTopologyScore } from './normalization';

export const calculateStabilityScore = (product: any): number => {
  const ripple = getRippleScore(product);
  const topology = getTopologyScore(product);
  const { RIPPLE, TOPOLOGY } = PSU_CONFIG.ESTABILIDAD.WEIGHTS;
  const score = RIPPLE * ripple.score + TOPOLOGY * topology;

  // Missing measurements are not treated as a catastrophic PSU, but they
  // cannot receive a fully verified stability score either.
  return score10(ripple.hasData ? score : Math.min(score, 7));
};
