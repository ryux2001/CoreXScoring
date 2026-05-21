/**
 * MOTHERBOARD ELECTRICAL STABILITY SCORE CALCULATOR
 */

import { MOTHERBOARD_CONFIG } from '../../config/motherboard';
import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export const calculateElectricalStabilityScore = (product: any): number => {
  const specs = parseJsonbString(product?.specs || '{}');
  const technologies = parseJsonbString(product?.technologies || '[]');
  
  const { FASES, CALIDAD, ARQUITECTURA, TOTAL_POINTS } = MOTHERBOARD_CONFIG.ESTABILIDAD;

  // 1. Cantidad de Fases Reales (4000 pts)
  const vrmPhases = safeExtract(specs?.vrm_phases, 0);
  const phasesPoints = Math.min(FASES.MAX_POINTS, (vrmPhases / FASES.MAX_PHASES) * FASES.MAX_POINTS);

  // 2. Calidad de los componentes (4000 pts)
  const vrmQuality = safeExtract(specs?.vrm_quality_rating, 0);
  const qualityPoints = Math.min(CALIDAD.MAX_POINTS, (vrmQuality / CALIDAD.MAX_RATING) * CALIDAD.MAX_POINTS);

  // 3. Arquitectura de Energía (DrMOS) (2000 pts)
  const techStr = (Array.isArray(technologies) ? technologies : [])
    .map((t: any) => `${t.name || ''} ${t.description || ''}`)
    .join(' ')
    .toLowerCase();
    
  let archPoints = ARQUITECTURA.BASIC_POINTS;
  if (ARQUITECTURA.KEYWORDS.some(k => techStr.includes(k))) {
    archPoints = ARQUITECTURA.MAX_POINTS;
  }

  const totalPoints = phasesPoints + qualityPoints + archPoints;
  return formatNoteScore(Math.min(10, (totalPoints / TOTAL_POINTS) * 10));
};