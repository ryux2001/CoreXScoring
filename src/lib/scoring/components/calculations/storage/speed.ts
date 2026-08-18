/**
 * STORAGE SPEED SCORE CALCULATOR
 *
 * CrystalDisk values are preferred when present because they describe the
 * same sequential workload users actually see. The theoretical spec values
 * are only the fallback, so the metric is not double-counted.
 */

import { STORAGE_CONFIG } from '../../config/storage';
import {
  clamp01,
  getStorageSpeeds,
  score10,
} from './normalization';

export const calculateSpeedScore = (product: any): number => {
  const { read, write } = getStorageSpeeds(product);
  const { TEORICA } = STORAGE_CONFIG.VELOCIDAD;
  const readReference = STORAGE_CONFIG.VELOCIDAD.NORMALIZATION.READ_REFERENCE;
  const writeReference = STORAGE_CONFIG.VELOCIDAD.NORMALIZATION.WRITE_REFERENCE;
  const readRatio = Math.log(1 + Math.min(read, TEORICA.READ_MAX) / readReference) /
    Math.log(1 + TEORICA.READ_MAX / readReference);
  const writeRatio = Math.log(1 + Math.min(write, TEORICA.WRITE_MAX) / writeReference) /
    Math.log(1 + TEORICA.WRITE_MAX / writeReference);

  return score10(10 * (0.55 * clamp01(readRatio) + 0.45 * clamp01(writeRatio)));
};
