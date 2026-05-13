/**
 * CPU EFFICIENCY SCORE CALCULATOR
 * Calcula la nota de eficiencia para CPU
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateEfficiencyScore = (product: any): number => {
  const specs = product?.specs || {};
  
  // Extraer datos relevantes para eficiencia
  const tdp = safeExtract(specs?.tdp || specs?.power_base, 0);
  const turbo = safeExtract(specs?.turbo_frequency, 0);
  
  // Eficiencia se mide inversamente al TDP
  // TDP más bajo = eficiencia mejor (10 - TDP/200)
  const baseScore = 10 - (tdp / 200);
  
  return formatNoteScore(Math.min(10, Math.max(0, baseScore)));
};
