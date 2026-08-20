/**
 * RAM VALUE SCORE
 *
 * Capacity, generation and technical utility determine a common fair price.
 * This lets exceptional deals reach the top of the scale without rewarding a
 * kit merely because its own historical MSRP was unusually high.
 */

import { calculateGamesScore } from './games';
import { calculateLatencyScore } from './latency';
import { calculateProductivityScore } from './productivity';
import { calculateSpeedScore } from './speed';
import { calculateTechnologiesScore } from './technologies';
import { getPrice, normalizeRamProduct, score10 } from './normalization';
import { RAM_CONFIG } from '../../config/ram';
import {
  interpolateAnchors,
  RAM_VALUE_RATIO_ANCHORS,
  scoreFromFairPrice,
} from '../value-curve';

export const calculateValueScore = (
  notes: Record<string, number>,
  evaluatedPrice: number,
  product: Record<string, unknown>,
): number => {
  const price = getPrice(evaluatedPrice);
  if (price === null) return 0;

  const fairPrice = getRamFairPrice(notes, product);
  if (fairPrice <= 0) return 0;

  return score10(scoreFromFairPrice(
    price,
    fairPrice,
    RAM_VALUE_RATIO_ANCHORS,
  ));
};

export const getRamFairPrice = (
  notes: Record<string, number>,
  product: Record<string, unknown>,
): number => {

  // Recalculate from the product when possible so the value score cannot be
  // distorted by stale or differently labelled notes from legacy callers.
  const calculatedNotes = {
    speed: calculateSpeedScore(product),
    latency: calculateLatencyScore(product),
    productivity: calculateProductivityScore(product),
    gaming: calculateGamesScore(product),
    technologies: calculateTechnologiesScore(product),
  };
  const features = normalizeRamProduct(product);
  const hasTechnicalData = features.hasValidTechnicalData;
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
  const capacityGb = features.capacityGb;
  const capacityAdequacy = capacityGb > 0 && capacityGb < 8
    ? 0.7
    : capacityGb > 0 && capacityGb < 16
      ? 0.88
      : 1;
  const utility = baseUtility * capacityAdequacy;
  const capacityAnchors = features.generation >= 5
    ? RAM_CONFIG.VALUE_FAIR_PRICE_CAPACITY_USD.DDR5
    : features.generation === 4
      ? RAM_CONFIG.VALUE_FAIR_PRICE_CAPACITY_USD.DDR4
      : RAM_CONFIG.VALUE_FAIR_PRICE_CAPACITY_USD.DEFAULT;
  const capacityReference = interpolateAnchors(capacityGb, capacityAnchors);
  const qualityFactor = RAM_CONFIG.VALUE_FAIR_PRICE_QUALITY_BASE +
    utility * RAM_CONFIG.VALUE_FAIR_PRICE_QUALITY_WEIGHT;
  const fairPrice = capacityReference * qualityFactor;
  return Number.isFinite(fairPrice) && fairPrice > 0 ? fairPrice : 0;
};
