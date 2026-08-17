/**
 * RAM GAMING SCORE
 *
 * Gaming is latency- and bandwidth-sensitive, while capacity has a practical
 * floor rather than an unlimited bonus.
 */

import { calculateLatencyScore } from './latency';
import { calculateSpeedScore } from './speed';
import { normalizeRamProduct, score10 } from './normalization';
import { RAM_CONFIG } from '../../config/ram';

export const calculateGamesScore = (product: any): number => {
  const features = normalizeRamProduct(product);
  const speed = calculateSpeedScore(product) / 10;
  const latency = calculateLatencyScore(product) / 10;
  const profileAndStability = (features.profileScore * 0.7) + (features.overclockingScore * 0.3);

  let score = (
    speed * RAM_CONFIG.JUEGOS.SPEED_WEIGHT +
    latency * RAM_CONFIG.JUEGOS.LATENCY_WEIGHT +
    features.channelScore * RAM_CONFIG.JUEGOS.CHANNEL_WEIGHT +
    profileAndStability * RAM_CONFIG.JUEGOS.STABILITY_WEIGHT
  ) * 10;

  if (features.capacityGb > 0 && features.capacityGb < RAM_CONFIG.JUEGOS.CAPACITY_FLOOR_GB) {
    score *= features.capacityGb < 8 ? 0.8 : 0.92;
  }

  return score10(score);
};

export const calculateGamingScore = calculateGamesScore;
