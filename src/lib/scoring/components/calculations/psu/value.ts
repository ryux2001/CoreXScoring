/** PSU quality-price score with capacity-aware reference pricing. */

import { PSU_CONFIG } from '../../config/psu';
import { finiteNumber, getPrice, getSpecs, interpolate, score10 } from './normalization';

export const calculateValueScore = (
  notes: Record<string, number>,
  evaluatedPrice: number,
  product: any,
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
  const valueIndex = (utility / 10) * Math.pow(
    referencePrice / price,
    PSU_CONFIG.VALUE_PRICE_EXPONENT,
  );
  if (!Number.isFinite(valueIndex) || valueIndex <= 0) return 0;

  const poweredIndex = Math.pow(valueIndex, PSU_CONFIG.VALUE_LOGISTIC_EXPONENT);
  const score = 10 * poweredIndex / (poweredIndex + PSU_CONFIG.VALUE_LOGISTIC_OFFSET);
  return score10(score);
};
