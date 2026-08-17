/**
 * RAM LATENCY SCORE
 *
 * CAS latency is derived from the declared specification. Benchmark latency
 * is deliberately ignored because it is incomplete and contradictory in the
 * current catalogue.
 */

import {
  inverseNormalizeRange,
  normalizeRamProduct,
  score10,
} from './normalization';
import { RAM_CONFIG } from '../../config/ram';

export const calculateLatencyScore = (product: any): number => {
  const features = normalizeRamProduct(product);
  if (features.casLatencyNs <= 0) return 0;

  // 8 ns is a high-end anchor and 16 ns is a low-end practical anchor.
  const latencyScore = inverseNormalizeRange(
    features.casLatencyNs,
    RAM_CONFIG.LATENCIA.BEST_NS,
    RAM_CONFIG.LATENCIA.WORST_NS,
  ) * 10;
  return score10(latencyScore);
};
