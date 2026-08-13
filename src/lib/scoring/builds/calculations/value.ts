import { BUILD_SCORING_CONFIG } from '../config';
import { Build, BuildScores, BUILD_PARTS } from '../types';
import { clamp, getNote } from '../utils';
import { getBuildPartPrice } from './prices';

/**
 * Combine component value scores using each part's share of the build price,
 * then apply the existing compatibility, bottleneck and upgrade modifiers.
 */
export const getBuildValue = (
  build: Build,
  scores: BuildScores,
  compatibility: number,
  bottleneck: number,
  upgrades: number,
  currency: string,
): number => {
  if (BUILD_PARTS.some((part) => !build?.[part])) return 0;

  const prices = BUILD_PARTS.map((part) => getBuildPartPrice(build, part, currency));
  const totalPrice = prices.reduce((total, price) => total + price, 0);
  if (totalPrice <= 0) return 0;

  const values = BUILD_PARTS.map((part) =>
    getNote(scores[part], ['Calidad precio', 'Calidad Precio']),
  );
  const weightedPartsValue = values.reduce(
    (total, value, index) => total + value * (prices[index] / totalPrice),
    0,
  );
  const config = BUILD_SCORING_CONFIG.VALUE;

  let note = clamp(
    weightedPartsValue *
      (config.BASE_FACTOR + compatibility * config.COMPATIBILITY_FACTOR) *
      (config.BOTTLENECK_BASE_FACTOR + bottleneck * config.BOTTLENECK_FACTOR) *
      (config.UPGRADES_BASE_FACTOR + upgrades * config.UPGRADES_FACTOR),
  );

  if (compatibility < config.LOW_COMPATIBILITY_THRESHOLD) note = Math.min(note, compatibility);
  if (compatibility < config.CRITICAL_COMPATIBILITY_THRESHOLD) note = Math.min(note, config.CRITICAL_VALUE_CAP);
  if (bottleneck < config.LOW_BOTTLENECK_THRESHOLD) note = Math.min(note, config.LOW_BOTTLENECK_CAP);

  return clamp(note);
};
