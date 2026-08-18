/**
 * MOTHERBOARD COMPATIBILITY SCORE CALCULATOR
 *
 * Compatibility means platform runway, memory standard and PCIe readiness.
 * Socket longevity is deliberately the largest factor so a modern AM5 board
 * is not beaten by an older board merely because it advertises faster RAM OC.
 */

import { MOTHERBOARD_CONFIG } from '../../config/motherboard';
import {
  getM2Slots,
  getMaxRamSpeed,
  getPcieGeneration,
  getPcieSlots,
  getPrimaryPcieIndex,
  getRamGeneration,
  getSocket,
  interpolate,
  score10,
} from './normalization';

export const calculateCompatibilityScore = (product: any): number => {
  const socket = getSocket(product);
  const socketScore = MOTHERBOARD_CONFIG.COMPATIBILIDAD.SOCKET[socket as keyof typeof MOTHERBOARD_CONFIG.COMPATIBILIDAD.SOCKET]
    ?? MOTHERBOARD_CONFIG.COMPATIBILIDAD.SOCKET.DEAD;
  const ramSpeed = getMaxRamSpeed(product);
  const ramAnchors = getRamGeneration(product) === 'DDR5'
    ? MOTHERBOARD_CONFIG.COMPATIBILIDAD.RAM_DDR5_ANCHORS
    : MOTHERBOARD_CONFIG.COMPATIBILIDAD.RAM_DDR4_ANCHORS;
  const memoryScore = ramSpeed > 0 ? interpolate(ramSpeed, ramAnchors) : 5;

  const pcieSlots = getPcieSlots(product);
  const primaryIndex = getPrimaryPcieIndex(pcieSlots);
  const primaryGeneration = primaryIndex >= 0 ? getPcieGeneration(pcieSlots[primaryIndex]) : 0;
  const m2Generation = Math.max(0, ...getM2Slots(product).map(getPcieGeneration));
  const generationScore = (generation: number): number => generation >= 5
    ? MOTHERBOARD_CONFIG.COMPATIBILIDAD.PCIE_GENERATION_SCORES.GEN5
    : generation === 4
      ? MOTHERBOARD_CONFIG.COMPATIBILIDAD.PCIE_GENERATION_SCORES.GEN4
      : generation === 3
        ? MOTHERBOARD_CONFIG.COMPATIBILIDAD.PCIE_GENERATION_SCORES.GEN3
        : MOTHERBOARD_CONFIG.COMPATIBILIDAD.PCIE_GENERATION_SCORES.UNKNOWN;
  const pcieReadiness = (generationScore(primaryGeneration) + generationScore(m2Generation)) / 2;
  const weights = MOTHERBOARD_CONFIG.COMPATIBILIDAD.WEIGHTS;

  return score10(
    socketScore * weights.SOCKET +
    memoryScore * weights.MEMORY +
    pcieReadiness * weights.PCIE_READINESS,
  );
};
