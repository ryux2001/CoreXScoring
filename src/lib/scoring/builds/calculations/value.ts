import { BUILD_SCORING_CONFIG } from '../config';
import { Build, BuildScores, BUILD_PARTS } from '../types';
import { clamp } from '../utils';
import { getBuildPartPrice } from './prices';
import { getComponentFairPrice } from '../../components';
import { scoreFromFairPrice } from '../../components/calculations/value-curve';

/**
 * Apply the shared curve once to the build's total fair and evaluated prices.
 * Compatibility only acts as a safety cap for physically invalid builds;
 * balance and upgradeability remain independent visible notes.
 */
export const getBuildValue = (
  build: Build,
  scores: BuildScores,
  compatibility: number,
  currency: string,
): number => {
  if (BUILD_PARTS.some((part) => !build?.[part])) return 0;

  const prices = BUILD_PARTS.map((part) =>
    getBuildPartPrice(build, part, 'USD', currency),
  );
  const totalPrice = prices.reduce((total, price) => total + price, 0);
  if (totalPrice <= 0) return 0;

  const totalFairPrice = BUILD_PARTS.reduce(
    (total, part) => total + getComponentFairPrice(build[part], scores[part]),
    0,
  );
  const config = BUILD_SCORING_CONFIG.VALUE;
  let note = clamp(scoreFromFairPrice(totalPrice, totalFairPrice));

  if (compatibility < config.LOW_COMPATIBILITY_THRESHOLD) note = Math.min(note, compatibility);
  if (compatibility <= config.CRITICAL_COMPATIBILITY_THRESHOLD) note = Math.min(note, config.CRITICAL_VALUE_CAP);

  return clamp(note);
};
