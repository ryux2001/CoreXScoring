/**
 * STORAGE EFFICIENCY SCORE CALCULATOR
 *
 * Efficiency is performance delivered per reported energy metric, not merely
 * the lowest consumption. The DB update uses the 2.45–10.1 scale; legacy
 * 0–1 values are promoted in normalization until those rows are migrated.
 */

import {
  getEnergyMetric,
  getStorageSignals,
  getStorageSpeeds,
  interpolate,
  score10,
} from './normalization';
import { STORAGE_CONFIG } from '../../config/storage';

export const calculateEfficiencyScore = (product: any): number => {
  const energy = getEnergyMetric(product);
  const energyScore = interpolate(energy.value, STORAGE_CONFIG.EFICIENCIA.ENERGY_ANCHORS);
  const { read, write } = getStorageSpeeds(product);
  const throughput = Math.max(0, read + write);
  const throughputScore = Math.min(10, 10 * (
    Math.log(1 + throughput / 400) / Math.log(1 + 28100 / 400)
  ));
  const featureScore = getStorageSignals(product).powerFeature * 10;
  const weights = STORAGE_CONFIG.EFICIENCIA.WEIGHTS;
  const score = weights.ENERGY * energyScore +
    weights.THROUGHPUT * throughputScore +
    weights.POWER_FEATURE * featureScore;

  // Estimates should never outrank a measured value by accident.
  return score10(energy.estimated
    ? Math.min(STORAGE_CONFIG.EFICIENCIA.MISSING_ESTIMATE_CAP, score)
    : score);
};
