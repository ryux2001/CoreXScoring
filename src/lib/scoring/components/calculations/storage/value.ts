/**
 * STORAGE VALUE SCORE CALCULATOR
 *
 * Price is normalized per usable TB so a 2 TB drive is not compared as if it
 * had the same capacity as a 1 TB drive. The logistic curve avoids saturating
 * the note for very cheap, low-utility products.
 */

import { getCapacityGb, getPrice, score10 } from './normalization';
import { STORAGE_CONFIG } from '../../config/storage';

export const calculateValueScore = (notes: any, evaluatedPrice: number, product: any): number => {
  const price = getPrice(evaluatedPrice);
  const capacityGb = getCapacityGb(product);
  if (price === null || capacityGb <= 0) return 0;

  const weights = STORAGE_CONFIG.VALUE_WEIGHTS;
  const technicalUtility = (
    (notes.VELOCIDAD ?? 0) * (weights.VELOCIDAD_WEIGHT / 100) +
    (notes.DURABILIDAD ?? 0) * (weights.DURABILIDAD_WEIGHT / 100) +
    (notes.TECNOLOGIAS ?? 0) * (weights.TECNOLOGIAS_WEIGHT / 100) +
    (notes.EFICIENCIA ?? 0) * (weights.EFICIENCIA_WEIGHT / 100) +
    (notes.TEMPERATURAS ?? 0) * (weights.TEMPERATURAS_WEIGHT / 100)
  );
  const pricePerTb = price / (capacityGb / 1000);
  if (!Number.isFinite(pricePerTb) || pricePerTb <= 0 || technicalUtility <= 0) return 0;

  const valueIndex = (technicalUtility / 10) * Math.pow(
    STORAGE_CONFIG.VALUE_REFERENCE_PRICE_PER_TB / pricePerTb,
    STORAGE_CONFIG.VALUE_PRICE_EXPONENT,
  );
  return score10(10 * (valueIndex / (valueIndex + STORAGE_CONFIG.VALUE_LOGISTIC_OFFSET)));
};
