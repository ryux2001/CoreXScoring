/**
 * STORAGE TEMPERATURES SCORE CALCULATOR
 *
 * This note is intentionally thermal-only. Read speed must not make a hot
 * SSD look cooler; thermal-management hardware is a small, separate bonus.
 */

import { getBenchmarks, getStorageSignals, finiteNumber, interpolate, score10 } from './normalization';
import { STORAGE_CONFIG } from '../../config/storage';

export const calculateTemperaturesScore = (product: any): number => {
  const measuredTemp = finiteNumber(getBenchmarks(product).max_temp_c, NaN);
  const maxTemp = measuredTemp > 0 ? measuredTemp : 85;
  const thermalHeadroom = interpolate(maxTemp, STORAGE_CONFIG.TEMPERATURAS.ANCHORS);
  const featureBonus = getStorageSignals(product).thermalFeature * 10;

  return score10(
    STORAGE_CONFIG.TEMPERATURAS.HEADROOM_WEIGHT * thermalHeadroom +
    STORAGE_CONFIG.TEMPERATURAS.FEATURE_WEIGHT * featureBonus,
  );
};
