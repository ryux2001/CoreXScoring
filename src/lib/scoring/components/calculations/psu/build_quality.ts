/**
 * PSU BUILD QUALITY SCORE CALCULATOR
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

export const calculateBuildQualityScore = (product: any): number => {
  const benchmarks = parseJsonbString(product?.benchmarks || '{}');
  const technologies = parseJsonbString(product?.technologies || '[]');
  const tags = parseJsonbString(product?.tags || '[]');
  
  const { RUIDO, COMPONENTES, TOTAL_POINTS } = PSU_CONFIG.CONSTRUCCION;

  // 1. Acústica y Refrigeración (6000 pts)
  const noise = safeExtract(benchmarks?.noise_level_db, 45); // Peor caso por defecto
  let noisePts = 0;
  if (noise <= RUIDO.PERFECT_DB) {
    noisePts = RUIDO.MAX_POINTS;
  } else if (noise < RUIDO.WORST_DB) {
    noisePts = ((RUIDO.WORST_DB - noise) / RUIDO.RANGE) * RUIDO.MAX_POINTS;
  }

  // 2. Componentes Premium Internos (4000 pts)
  const allText = [
    (Array.isArray(technologies) ? technologies : []).map((t: any) => `${t.name} ${t.description}`).join(' '),
    (Array.isArray(tags) ? tags : []).join(' ')
  ].join(' ').toLowerCase();

  let componentsPts = 0;
  
  // Condensadores Japoneses
  if (COMPONENTES.CAP_KEYWORDS.some(k => allText.includes(k))) {
    componentsPts += COMPONENTES.POINTS_PER_FEATURE;
  }
  
  // Ventilador Premium / Zero Fan
  if (COMPONENTES.FAN_KEYWORDS.some(k => allText.includes(k))) {
    componentsPts += COMPONENTES.POINTS_PER_FEATURE;
  }

  const totalPoints = noisePts + componentsPts;
  return formatNoteScore(Math.min(10, (totalPoints / TOTAL_POINTS) * 10));
};