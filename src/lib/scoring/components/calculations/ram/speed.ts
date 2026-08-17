/**
 * RAM SPEED SCORE
 *
 * Uses theoretical effective bandwidth instead of the benchmark JSON. The
 * benchmark values in the catalogue are not consistent between equivalent
 * kits, while speed and module configuration are stable specification fields.
 */

import {
  getEffectiveBandwidth,
  normalizeRamProduct,
  normalizeRange,
  score10,
} from './normalization';
import { RAM_CONFIG } from '../../config/ram';

export const calculateSpeedScore = (product: any): number => {
  const features = normalizeRamProduct(product);
  const bandwidth = getEffectiveBandwidth(features);

  if (bandwidth <= 0) return 0;

  // 20 GB/s is a low current baseline and 100 GB/s is the upper anchor for
  // the catalogue. The fixed anchors keep scores stable when new RAM is added.
  const baseline = RAM_CONFIG.VELOCIDAD.BANDWIDTH_BASELINE_GBPS;
  const anchor = RAM_CONFIG.VELOCIDAD.BANDWIDTH_ANCHOR_GBPS;
  const bandwidthScore = 2 + normalizeRange(bandwidth, baseline, anchor) * 8;
  return score10(bandwidthScore);
};
