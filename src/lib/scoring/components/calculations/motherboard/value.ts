/**
 * MOTHERBOARD QUALITY-PRICE SCORE CALCULATOR
 *
 * Technical utility and platform longevity determine a category-level fair
 * price, making an equivalent modern platform win without using SKU MSRP.
 */

import { MOTHERBOARD_CONFIG } from '../../config/motherboard';
import { getPrice, score10 } from './normalization';
import { scoreFromFairPrice } from '../value-curve';

export const calculateValueScore = (
  notes: Record<string, number>,
  evaluatedPrice: number,
): number => {
  const price = getPrice(evaluatedPrice);
  if (price === null) return 0;

  const fairPrice = getMotherboardFairPrice(notes);
  if (fairPrice <= 0) return 0;
  return score10(scoreFromFairPrice(price, fairPrice));
};

export const getMotherboardFairPrice = (
  notes: Record<string, number>,
): number => {

  const weights = MOTHERBOARD_CONFIG.VALUE_WEIGHTS;
  const utility = (
    (notes.ESTABILIDAD ?? notes.Estabilidad ?? 0) * (weights.ESTABILIDAD / 100) +
    (notes.EXPANSION ?? notes['Expansión'] ?? 0) * (weights.EXPANSION / 100) +
    (notes.CONECTIVIDAD ?? notes.Conectividad ?? 0) * (weights.CONECTIVIDAD / 100) +
    (notes.TECNOLOGIAS ?? notes['Tecnologías'] ?? 0) * (weights.TECNOLOGIAS / 100) +
    (notes.COMPATIBILIDAD ?? notes['Compatibilidad'] ?? 0) * (weights.COMPATIBILIDAD / 100)
  );
  const compatibility = notes.COMPATIBILIDAD ?? notes['Compatibilidad'] ?? 0;
  const longevity = MOTHERBOARD_CONFIG.VALUE_LONGEVITY_BASE +
    MOTHERBOARD_CONFIG.VALUE_LONGEVITY_WEIGHT * (compatibility / 10);
  const fairPrice = MOTHERBOARD_CONFIG.VALUE_REFERENCE_PRICE_USD * Math.pow(
    ((utility / 10) * longevity) / MOTHERBOARD_CONFIG.VALUE_LOGISTIC_OFFSET,
    1 / MOTHERBOARD_CONFIG.VALUE_PRICE_EXPONENT,
  );

  return Number.isFinite(fairPrice) && fairPrice > 0 ? fairPrice : 0;
};
