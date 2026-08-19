/** PSU quality-price score with capacity-aware reference pricing. */

import { PSU_CONFIG } from '../../config/psu';
import { finiteNumber, getPrice, getSpecs, interpolate, score10 } from './normalization';
import { scoreFromFairPrice } from '../value-curve';

export const calculateValueScore = (
  notes: Record<string, number>,
  evaluatedPrice: number,
  product: Record<string, unknown>,
): number => {
  const price = getPrice(evaluatedPrice, product?.price_base_usd);
  const wattage = finiteNumber(getSpecs(product).wattage, NaN);
  if (price === null || !Number.isFinite(wattage) || wattage <= 0) return 0;

  const weights = PSU_CONFIG.VALUE_WEIGHTS;
  const utility = (
    finiteNumber(notes.ESTABILIDAD, 0) * weights.ESTABILIDAD +
    finiteNumber(notes.PROTECCIONES, 0) * weights.PROTECCIONES +
    finiteNumber(notes.CONSTRUCCION, 0) * weights.CONSTRUCCION +
    finiteNumber(notes.EFICIENCIA, 0) * weights.EFICIENCIA +
    finiteNumber(notes.CONECTIVIDAD, 0) * weights.CONECTIVIDAD
  );
  if (utility <= 0) return 0;

  const referencePrice = interpolate(wattage, PSU_CONFIG.VALUE_REFERENCE_PRICES);
  const midpointIndex = Math.pow(
    PSU_CONFIG.VALUE_LOGISTIC_OFFSET,
    1 / PSU_CONFIG.VALUE_LOGISTIC_EXPONENT,
  );
  const fairPrice = referencePrice * Math.pow(
    (utility / 10) / midpointIndex,
    1 / PSU_CONFIG.VALUE_PRICE_EXPONENT,
  );
  if (!Number.isFinite(fairPrice) || fairPrice <= 0) return 0;

  return score10(scoreFromFairPrice(price, fairPrice));
};
