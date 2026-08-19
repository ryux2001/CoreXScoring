/**
 * Shared quality-price curve.
 *
 * A product is compared with the fair price implied by its technical utility,
 * never with its own launch MSRP. This keeps two invariants across a category:
 * a cheaper equivalent product always scores higher, and a technically better
 * product always scores higher when both are evaluated at the same price.
 */

export type ValueRatioAnchor = readonly [ratio: number, score: number];

export const STANDARD_VALUE_RATIO_ANCHORS = [
  [0, 0],
  [0.25, 1],
  [0.5, 3],
  [0.75, 4],
  [1, 5],
  [1.25, 6],
  [1.5, 7],
  [2, 8.2],
  [3, 9.2],
  [4, 9.7],
  [5, 10],
] as const satisfies ReadonlyArray<ValueRatioAnchor>;

export const RAM_VALUE_RATIO_ANCHORS = [
  [0, 0],
  [0.25, 1],
  [0.5, 3],
  [0.75, 4],
  [1, 5],
  [1.25, 6],
  [1.5, 7],
  [2, 8.3],
  [2.5, 9.2],
  [3, 10],
] as const satisfies ReadonlyArray<ValueRatioAnchor>;

const positiveNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const interpolateAnchors = (
  value: number,
  anchors: ReadonlyArray<ValueRatioAnchor>,
): number => {
  if (!Number.isFinite(value) || anchors.length === 0) return 0;
  if (value <= anchors[0][0]) return anchors[0][1];

  for (let index = 1; index < anchors.length; index += 1) {
    const [rightValue, rightScore] = anchors[index];
    const [leftValue, leftScore] = anchors[index - 1];

    if (value <= rightValue) {
      const range = rightValue - leftValue;
      if (range <= 0) return rightScore;
      const progress = (value - leftValue) / range;
      return leftScore + (rightScore - leftScore) * progress;
    }
  }

  return anchors[anchors.length - 1][1];
};

export const scoreFromFairPrice = (
  evaluatedPrice: unknown,
  fairPrice: unknown,
  anchors: ReadonlyArray<ValueRatioAnchor> = STANDARD_VALUE_RATIO_ANCHORS,
): number => {
  const price = positiveNumber(evaluatedPrice);
  const fair = positiveNumber(fairPrice);
  if (price === null || fair === null) return 0;

  return interpolateAnchors(fair / price, anchors);
};
