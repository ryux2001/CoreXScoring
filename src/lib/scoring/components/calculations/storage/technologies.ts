/**
 * STORAGE TECHNOLOGIES SCORE CALCULATOR
 *
 * The score reflects real platform features (interface/protocol, NAND,
 * cache architecture and data-integrity support), not marketing or warranty
 * strings. In particular, DRAM-less drives never receive a DRAM bonus.
 */

import {
  getNandScore,
  getPcieScore,
  getProtocolScore,
  getStorageSignals,
  score10,
} from './normalization';
import { STORAGE_CONFIG } from '../../config/storage';

export const calculateTechnologiesScore = (product: any): number => {
  const pcie = getPcieScore(product);
  const protocol = getProtocolScore(product);
  const interfaceScore = 0.75 * pcie + 0.25 * protocol;
  const nand = getNandScore(product);
  const signals = getStorageSignals(product);
  const cache = signals.dram ? 0.95 : signals.hmb ? 0.72 : signals.slcCache ? 0.58 : 0.35;
  const integrity = Math.min(1, 0.4 + signals.integrityHits * 0.12);
  const weights = STORAGE_CONFIG.TECNOLOGIAS.WEIGHTS;

  return score10(10 * (
    weights.INTERFACE * interfaceScore +
    weights.NAND * nand +
    weights.CACHE * cache +
    weights.INTEGRITY * integrity
  ));
};
