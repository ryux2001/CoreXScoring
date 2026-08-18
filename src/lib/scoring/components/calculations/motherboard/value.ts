/**
 * MOTHERBOARD QUALITY-PRICE SCORE CALCULATOR
 *
 * Uses price per technical utility with a soft logistic ceiling. The
 * longevity factor gives platform compatibility a modest additional effect,
 * making an equivalent modern platform win when it is cheaper.
 */

import { MOTHERBOARD_CONFIG } from '../../config/motherboard';
import { getPrice, score10 } from './normalization';

export const calculateValueScore = (notes: any, evaluatedPrice: number, _product?: any): number => {
  const price = getPrice(evaluatedPrice);
  if (price === null) return 0;

  const weights = MOTHERBOARD_CONFIG.VALUE_WEIGHTS;
  const utility = (
    (notes.ESTABILIDAD ?? 0) * (weights.ESTABILIDAD / 100) +
    (notes.EXPANSION ?? notes['Expansión'] ?? 0) * (weights.EXPANSION / 100) +
    (notes.CONECTIVIDAD ?? 0) * (weights.CONECTIVIDAD / 100) +
    (notes.TECNOLOGIAS ?? notes['Tecnologías'] ?? 0) * (weights.TECNOLOGIAS / 100) +
    (notes.COMPATIBILIDAD ?? notes['Compatibilidad'] ?? 0) * (weights.COMPATIBILIDAD / 100)
  );
  const compatibility = notes.COMPATIBILIDAD ?? notes['Compatibilidad'] ?? 0;
  const longevity = MOTHERBOARD_CONFIG.VALUE_LONGEVITY_BASE +
    MOTHERBOARD_CONFIG.VALUE_LONGEVITY_WEIGHT * (compatibility / 10);
  const valueIndex = (utility / 10) * longevity * Math.pow(
    MOTHERBOARD_CONFIG.VALUE_REFERENCE_PRICE_USD / price,
    MOTHERBOARD_CONFIG.VALUE_PRICE_EXPONENT,
  );

  if (!Number.isFinite(valueIndex) || valueIndex <= 0) return 0;
  return score10(10 * (valueIndex / (valueIndex + MOTHERBOARD_CONFIG.VALUE_LOGISTIC_OFFSET)));
};
