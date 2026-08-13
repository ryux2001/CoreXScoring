/**
 * STORAGE EFFICIENCY SCORE CALCULATOR
 */

import { STORAGE_CONFIG } from '../../config/storage';
import { formatNoteScore } from '../../../shared/helpers';
import { safeExtract } from '../../../shared/validators';

function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export const calculateEfficiencyScore = (product: any): number => {
  const specs = parseJsonbString(product?.specs || '{}');
  const energyPerGb = safeExtract(specs?.energy_per_gb, 1.0); // Asumimos el peor caso (1.0 J/GB) si falta
  
  const { PERFECT_J_GB, WORST_J_GB, RANGE, TOTAL_POINTS } = STORAGE_CONFIG.EFICIENCIA;
  
  let points = 0;
  // Fórmula invertida
  if (energyPerGb <= PERFECT_J_GB) {
    points = TOTAL_POINTS;
  } else if (energyPerGb < WORST_J_GB) {
    points = ((WORST_J_GB - energyPerGb) / RANGE) * TOTAL_POINTS;
  }
  
  return formatNoteScore(Math.min(10, (points / TOTAL_POINTS) * 10));
};