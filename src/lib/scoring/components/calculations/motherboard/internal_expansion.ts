/**
 * MOTHERBOARD INTERNAL EXPANSION SCORE CALCULATOR
 *
 * Counts in strings such as "4x PCIe 4.0 x4" are expanded and each extra
 * slot contributes less than the previous one. This prevents high-end boards
 * from collapsing into a large group of identical 10/10 scores.
 */

import { MOTHERBOARD_CONFIG } from '../../config/motherboard';
import {
  getM2Slots,
  getPcieGeneration,
  getPcieSlots,
  getPrimaryPcieIndex,
  getSlotLaneWidth,
  score10,
} from './normalization';

export const calculateInternalExpansionScore = (product: any): number => {
  const pcieSlots = getPcieSlots(product);
  const m2Slots = getM2Slots(product).sort((left, right) => getPcieGeneration(right) - getPcieGeneration(left));
  const primaryIndex = getPrimaryPcieIndex(pcieSlots);
  const primaryGeneration = primaryIndex >= 0 ? getPcieGeneration(pcieSlots[primaryIndex]) : 0;
  const primaryScore = primaryGeneration >= 5 ? 10 : primaryGeneration === 4 ? 8.5 : primaryGeneration === 3 ? 6 : 0;

  const margins = MOTHERBOARD_CONFIG.EXPANSION.M2_MARGINALS;
  const m2Utility = m2Slots.reduce((total, slot, index) => {
    const generationMultiplier = getPcieGeneration(slot) >= 5
      ? 1.15
      : getPcieGeneration(slot) === 4
        ? 1
        : getPcieGeneration(slot) === 3
          ? 0.7
          : 0.5;
    return total + (margins[index] ?? 0.3) * generationMultiplier;
  }, 0);
  const m2Score = Math.min(10, (m2Utility / MOTHERBOARD_CONFIG.EXPANSION.M2_REFERENCE_UTILITY) * 10);

  const secondaryUtility = pcieSlots.reduce((total, slot, index) => {
    if (index === primaryIndex) return total;
    const laneWidth = getSlotLaneWidth(slot);
    const laneScore = laneWidth >= 8 ? 3.5 : laneWidth >= 4 ? 2.5 : laneWidth >= 1 ? 1 : 0;
    const generationMultiplier = getPcieGeneration(slot) >= 5
      ? 1.2
      : getPcieGeneration(slot) === 4
        ? 1
        : getPcieGeneration(slot) === 3
          ? 0.7
          : 0.5;
    return total + laneScore * generationMultiplier;
  }, 0);
  const secondaryScore = Math.min(
    10,
    (secondaryUtility / MOTHERBOARD_CONFIG.EXPANSION.SECONDARY_REFERENCE_UTILITY) * 10,
  );
  const weights = MOTHERBOARD_CONFIG.EXPANSION.WEIGHTS;

  return score10(
    primaryScore * weights.PRIMARY_GPU +
    m2Score * weights.M2 +
    secondaryScore * weights.SECONDARY_PCIE,
  );
};
