/**
 * CPU GAMING SCORE CALCULATOR
 * Calcula la nota de gaming para CPU
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateGamingScore = (product: any): number => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  // Extraer datos relevantes para gaming
  const geekbench = safeExtract(benchmarks?.geekbench_single, 0);
  const turbo = safeExtract(specs?.turbo_frequency, 0);
  const threads = parseInt(specs?.threads || '0', 10);
  
  // Gaming se mide por Geekbench single + turbo + hilos
  const score = (geekbench * 0.4) + (turbo * 0.4) + (threads * 0.2);
  
  return formatNoteScore(score);
};
