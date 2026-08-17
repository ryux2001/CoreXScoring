/**
 * RAM VALUE SCORE
 *
 * Value is calculated from technical utility and price, not from a raw
 * average of the visible notes. A diminishing price exponent prevents very
 * cheap low-capacity modules from dominating, while preserving the invariant
 * that an equivalent cheaper kit scores higher.
 */

import { calculateGamesScore } from './games';
import { calculateLatencyScore } from './latency';
import { calculateProductivityScore } from './productivity';
import { calculateSpeedScore } from './speed';
import { calculateTechnologiesScore } from './technologies';
import { getPrice, normalizeRamProduct, score10 } from './normalization';
import { RAM_CONFIG } from '../../config/ram';

export const calculateValueScore = (
  notes: Record<string, number>,
  evaluatedPrice: number,
  product: any,
): number => {
  const price = getPrice(evaluatedPrice);
  if (price === null) return 0;

  // Recalculate from the product when possible so the value score cannot be
  // distorted by stale or differently labelled notes from legacy callers.
  const calculatedNotes = {
    speed: calculateSpeedScore(product),
    latency: calculateLatencyScore(product),
    productivity: calculateProductivityScore(product),
    gaming: calculateGamesScore(product),
    technologies: calculateTechnologiesScore(product),
  };
  const hasTechnicalData = normalizeRamProduct(product).hasValidTechnicalData;
  const source = hasTechnicalData ? calculatedNotes : {
    speed: notes.VELOCIDAD ?? notes.Velocidad ?? 0,
    latency: notes.LATENCIA ?? notes.Latencia ?? 0,
    productivity: notes.PRODUCTIVIDAD ?? notes.Productividad ?? 0,
    gaming: notes.JUEGOS ?? notes.Gaming ?? notes.Juegos ?? 0,
    technologies: notes.TECNOLOGIAS ?? notes.Tecnologías ?? 0,
  };

  const weights = RAM_CONFIG.VALUE_WEIGHTS;
  const baseUtility = (
    source.speed * (weights.VELOCIDAD_WEIGHT / 100) +
    source.productivity * (weights.PRODUCTIVIDAD_WEIGHT / 100) +
    source.latency * (weights.LATENCIA_WEIGHT / 100) +
    source.technologies * (weights.TECNOLOGIAS_WEIGHT / 100) +
    source.gaming * (weights.JUEGOS_WEIGHT / 100)
  ) / 10;
  const capacityGb = normalizeRamProduct(product).capacityGb;
  const capacityAdequacy = capacityGb > 0 && capacityGb < 8
    ? 0.7
    : capacityGb > 0 && capacityGb < 16
      ? 0.88
      : 1;
  const utility = baseUtility * capacityAdequacy;

  // Price is expressed in the same USD basis used by the existing callers.
  // The exponent gives price diminishing returns without removing its effect.
  const priceFactor = Math.pow(
    RAM_CONFIG.VALUE_PRICE_REFERENCE / price,
    RAM_CONFIG.VALUE_PRICE_EXPONENT,
  );
  const valueIndex = utility * priceFactor;
  const valueScore = (valueIndex / (valueIndex + 0.75)) * 10;

  return score10(valueScore);
};
