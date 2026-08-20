/**
 * STORAGE VALUE SCORE CALCULATOR
 *
 * Price is normalized per usable TB and technical utility determines the fair
 * price. The final ratio curve is shared and independent of each drive's MSRP.
 */

import { getCapacityGb, getPrice, score10 } from './normalization';
import { STORAGE_CONFIG } from '../../config/storage';
import { scoreFromFairPrice } from '../value-curve';

export const calculateValueScore = (
  notes: Record<string, number>,
  evaluatedPrice: number,
  product: Record<string, unknown>,
): number => {
  const price = getPrice(evaluatedPrice);
  if (price === null) return 0;

  const fairPrice = getStorageFairPrice(notes, product);
  if (fairPrice <= 0) return 0;

  return score10(scoreFromFairPrice(price, fairPrice));
};

export const getStorageFairPrice = (
  notes: Record<string, number>,
  product: Record<string, unknown>,
): number => {
  const capacityGb = getCapacityGb(product);
  if (capacityGb <= 0) return 0;

  const weights = STORAGE_CONFIG.VALUE_WEIGHTS;
  const technicalUtility = (
    (notes.VELOCIDAD ?? notes.Velocidad ?? 0) * (weights.VELOCIDAD_WEIGHT / 100) +
    (notes.DURABILIDAD ?? notes.Durabilidad ?? 0) * (weights.DURABILIDAD_WEIGHT / 100) +
    (notes.TECNOLOGIAS ?? notes['Tecnologías'] ?? 0) * (weights.TECNOLOGIAS_WEIGHT / 100) +
    (notes.EFICIENCIA ?? notes.Eficiencia ?? 0) * (weights.EFICIENCIA_WEIGHT / 100) +
    (notes.TEMPERATURAS ?? notes.Temperaturas ?? 0) * (weights.TEMPERATURAS_WEIGHT / 100)
  );
  const capacityTb = capacityGb / 1000;
  if (!Number.isFinite(capacityTb) || capacityTb <= 0 || technicalUtility <= 0) return 0;

  const fairPrice = STORAGE_CONFIG.VALUE_REFERENCE_PRICE_PER_TB * capacityTb * Math.pow(
    (technicalUtility / 10) / STORAGE_CONFIG.VALUE_LOGISTIC_OFFSET,
    1 / STORAGE_CONFIG.VALUE_PRICE_EXPONENT,
  );

  return Number.isFinite(fairPrice) && fairPrice > 0 ? fairPrice : 0;
};
