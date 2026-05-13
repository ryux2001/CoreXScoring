/**
 * CPU VALUE SCORE CALCULATOR
 * Calcula la nota de calidad precio para CPU
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateValueScore = (product: any, evaluatedPrice: number): number => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  // Extraer datos relevantes para valor
  const cinebench = safeExtract(benchmarks?.cinebench_multi, 0);
  const cacheMB = safeExtract(specs?.cache?.l3, 0) / 1024;
  const threads = parseInt(specs?.threads || '0', 10);
  
  // Valor = rendimiento / precio
  // Puntos de rendimiento
  const performancePoints = (cinebench * 0.6) + (cacheMB * 0.4);
  
  // Factor de precio (más bajo = mejor valor)
  const pricePoints = 10000 / (evaluatedPrice + 1);
  
  // Normalizar y combinar
  const totalPoints = (performancePoints * 0.7) + (pricePoints * 0.3);
  
  return formatNoteScore(totalPoints);
};
