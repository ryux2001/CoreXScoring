/**
 * PSU STABILITY SCORE CALCULATOR
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

export const calculateStabilityScore = (product: any): number => {
  const specs = parseJsonbString(product?.specs || '{}');
  const technologies = parseJsonbString(product?.technologies || '[]');
  
  const { RIZADO, TOPOLOGIA, TOTAL_POINTS } = PSU_CONFIG.ESTABILIDAD;

  // 1. Pureza de la Señal / Rizado (7000 pts)
  const ripple = safeExtract(specs?.ripple_mv, 80); // Asumimos peor caso si no hay datos
  let ripplePts = 0;
  if (ripple <= RIZADO.PERFECT_MV) {
    ripplePts = RIZADO.MAX_POINTS;
  } else if (ripple < RIZADO.WORST_MV) {
    ripplePts = ((RIZADO.WORST_MV - ripple) / RIZADO.RANGE) * RIZADO.MAX_POINTS;
  }

  // 2. Topología Interna (3000 pts)
  const techStr = (Array.isArray(technologies) ? technologies : [])
    .map((t: any) => `${t.name || ''} ${t.description || ''}`)
    .join(' ')
    .toLowerCase();
    
  let topologyPts = TOPOLOGIA.NONE;
  if (techStr.includes('llc') && (techStr.includes('dc-to-dc') || techStr.includes('dc to dc'))) {
    topologyPts = TOPOLOGIA.LLC_DC;
  } else if (techStr.includes('dc-to-dc') || techStr.includes('dc to dc')) {
    topologyPts = TOPOLOGIA.DC_ONLY;
  }

  const totalPoints = ripplePts + topologyPts;
  return formatNoteScore(Math.min(10, (totalPoints / TOTAL_POINTS) * 10));
};