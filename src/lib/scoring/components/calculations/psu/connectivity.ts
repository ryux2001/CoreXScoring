/** PSU connector inventory score. */

import { PSU_CONFIG } from '../../config/psu';
import {
  getAtxFallbackScore,
  getConnectorInventory,
  getModularityScore,
  score10,
} from './normalization';

function diminishingCount(value: number, cap: number): number {
  if (cap <= 0 || value <= 0) return 0;
  return Math.log1p(Math.min(value, cap)) / Math.log1p(cap);
}

export const calculateConnectivityScore = (product: any): number => {
  const inventory = getConnectorInventory(product);
  const modularity = getModularityScore(product);

  // During a partial migration, use only the structured fields that still
  // exist and cap the result. Never invent connector counts from wattage,
  // GPU names, tags or marketing descriptions.
  if (!inventory.isComplete) {
    const fallback = PSU_CONFIG.CONECTIVIDAD.FALLBACK;
    const atx = getAtxFallbackScore(product);
    const fallbackScore = 10 * (
      fallback.ATX_WEIGHT * atx + fallback.MODULARITY_WEIGHT * modularity
    );
    return score10(Math.min(fallback.MAX_SCORE, fallbackScore));
  }

  const weights = PSU_CONFIG.CONECTIVIDAD.WEIGHTS;
  const caps = PSU_CONFIG.CONECTIVIDAD.CAPS;
  const pcieLegacy = diminishingCount(inventory.pcie6Plus2 ?? 0, caps.PCIE_LEGACY);
  const gpuModern = inventory.pcie12V2x6 && inventory.pcie12V2x6 > 0
    ? PSU_CONFIG.CONECTIVIDAD.NATIVE.V2X6
    : inventory.pcie12Vhpwr && inventory.pcie12Vhpwr > 0
      ? PSU_CONFIG.CONECTIVIDAD.NATIVE.HPWR
      : PSU_CONFIG.CONECTIVIDAD.NATIVE.NONE;
  const eps = Math.min(inventory.eps8Pin ?? 0, caps.EPS) / caps.EPS;
  const sata = diminishingCount(inventory.sata ?? 0, caps.SATA);
  const molex = diminishingCount(inventory.molex ?? 0, caps.MOLEX);

  const score = 10 * (
    weights.PCIE_LEGACY * pcieLegacy +
    weights.GPU_MODERN * gpuModern +
    weights.EPS * eps +
    weights.SATA * sata +
    weights.MOLEX * molex +
    weights.MODULARITY * modularity
  );

  return score10(score);
};
