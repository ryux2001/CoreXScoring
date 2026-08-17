/**
 * RAM PRODUCTIVITY SCORE
 *
 * Capacity is the main differentiator for large projects, with diminishing
 * returns so that doubling capacity does not automatically double the note.
 */

import { calculateLatencyScore } from './latency';
import { calculateSpeedScore } from './speed';
import {
  getCapacityScore,
  normalizeRamProduct,
  score10,
} from './normalization';
import { RAM_CONFIG } from '../../config/ram';

export const calculateProductivityScore = (product: any): number => {
  const features = normalizeRamProduct(product);
  const capacity = getCapacityScore(features.capacityGb) / 10;
  const speed = calculateSpeedScore(product) / 10;
  const latency = calculateLatencyScore(product) / 10;

  const score = (
    capacity * RAM_CONFIG.PRODUCTIVIDAD.CAPACITY_WEIGHT +
    speed * RAM_CONFIG.PRODUCTIVIDAD.SPEED_WEIGHT +
    features.channelScore * RAM_CONFIG.PRODUCTIVIDAD.CHANNEL_WEIGHT +
    latency * RAM_CONFIG.PRODUCTIVIDAD.LATENCY_WEIGHT
  ) * 10;

  return score10(score);
};
