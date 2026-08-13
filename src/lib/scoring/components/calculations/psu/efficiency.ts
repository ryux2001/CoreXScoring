/**
 * PSU EFFICIENCY SCORE CALCULATOR
 */

import { PSU_CONFIG } from '../../config/psu';
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
  const benchmarks = parseJsonbString(product?.benchmarks || '{}');
  
  const { CERTIFICACION, CARGA_50, HOLGURA, TOTAL_POINTS } = PSU_CONFIG.EFICIENCIA;

  // 1. Certificación 80 Plus (5000 pts)
  const effStr = (specs?.efficiency || '').toLowerCase();
  let certPts = CERTIFICACION.NONE;
  if (effStr.includes('titanium')) certPts = CERTIFICACION.TITANIUM;
  else if (effStr.includes('platinum')) certPts = CERTIFICACION.PLATINUM;
  else if (effStr.includes('gold')) certPts = CERTIFICACION.GOLD;
  else if (effStr.includes('silver')) certPts = CERTIFICACION.SILVER;
  else if (effStr.includes('bronze')) certPts = CERTIFICACION.BRONZE;

  // 2. Eficiencia Real en el Punto Dulce (3000 pts)
  const load50 = safeExtract(benchmarks?.efficiency_load_50, 80);
  let loadPts = 0;
  if (load50 >= CARGA_50.PERFECT_PCT) {
    loadPts = CARGA_50.MAX_POINTS;
  } else if (load50 > CARGA_50.WORST_PCT) {
    loadPts = ((load50 - CARGA_50.WORST_PCT) / CARGA_50.RANGE) * CARGA_50.MAX_POINTS;
  }

  // 3. Holgura de Potencia (2000 pts)
  const wattage = safeExtract(specs?.wattage, 400);
  let wattagePts = 0;
  if (wattage >= HOLGURA.PERFECT_W) {
    wattagePts = HOLGURA.MAX_POINTS;
  } else if (wattage > HOLGURA.WORST_W) {
    wattagePts = ((wattage - HOLGURA.WORST_W) / HOLGURA.RANGE) * HOLGURA.MAX_POINTS;
  }

  const totalPoints = certPts + loadPts + wattagePts;
  return formatNoteScore(Math.min(10, (totalPoints / TOTAL_POINTS) * 10));
};