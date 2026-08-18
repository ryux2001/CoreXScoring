/**
 * STORAGE DURABILITY SCORE CALCULATOR
 *
 * TBW is evaluated both relative to capacity and in absolute terms. This
 * keeps a 2 TB model from being penalized for having the same TBW/TB as its
 * 1 TB sibling, while still rewarding the larger endurance budget modestly.
 */

import {
  getCapacityGb,
  getNandScore,
  getStorageSignals,
  getTbw,
  interpolate,
  score10,
} from './normalization';
import { STORAGE_CONFIG } from '../../config/storage';

export const calculateDurabilityScore = (product: any): number => {
  const tbw = getTbw(product);
  const capacityGb = getCapacityGb(product);
  const capacityTb = capacityGb / 1000;
  const tbwPerTb = capacityTb > 0 ? tbw / capacityTb : 0;
  const perTbScore = interpolate(tbwPerTb, STORAGE_CONFIG.DURABILIDAD.PER_TB_ANCHORS);
  const absoluteScore = interpolate(tbw, STORAGE_CONFIG.DURABILIDAD.ABSOLUTE_ANCHORS);
  const nandScore = getNandScore(product) * 10;
  const integrityScore = Math.min(10, 4 + getStorageSignals(product).integrityHits * 1.2);
  const weights = STORAGE_CONFIG.DURABILIDAD.WEIGHTS;

  return score10(
    weights.PER_TB * perTbScore +
    weights.ABSOLUTE * absoluteScore +
    weights.NAND * nandScore +
    weights.INTEGRITY * integrityScore,
  );
};
