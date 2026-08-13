import { getComponentNotes } from '@/lib/scoring';
import { Build, BuildScores, BUILD_PARTS } from '../types';
import { getBuildPartPrice } from './prices';

/** Calculate the component-level notes used by all build-level metrics. */
export const getComponentScores = (
  build: Build,
  currency: string,
  draftCurrency?: string,
): BuildScores => {
  const scores: BuildScores = {};

  for (const part of BUILD_PARTS) {
    const product = build?.[part];
    scores[part] = product
      ? getComponentNotes(product, getBuildPartPrice(build, part, currency, draftCurrency))
      : {};
  }

  return scores;
};
