/**
 * PSU CONNECTIVITY SCORE CALCULATOR
 */

import { PSU_CONFIG } from '../../config/psu';
import { formatNoteScore } from '../../../shared/helpers';

function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export const calculateConnectivityScore = (product: any): number => {
  const specs = parseJsonbString(product?.specs || '{}');
  const technologies = parseJsonbString(product?.technologies || '[]');
  const tags = parseJsonbString(product?.tags || '[]');
  const compatibility = parseJsonbString(product?.compatibility || '{}');
  
  const { ATX, MODULARIDAD, TOTAL_POINTS } = PSU_CONFIG.CONECTIVIDAD;

  // Consolidar todos los textos posibles donde pueda mencionar el estándar
  const allText = [
    specs?.modular_type || '',
    (Array.isArray(technologies) ? technologies : []).map((t: any) => `${t.name} ${t.description}`).join(' '),
    (Array.isArray(tags) ? tags : []).join(' '),
    JSON.stringify(compatibility)
  ].join(' ').toLowerCase();

  // 1. Preparación para GPUs de Nueva Generación (6000 pts)
  let atxPts = ATX.ATX2; // Base por defecto
  if (allText.includes('atx 3.1') || allText.includes('12v-2x6') || allText.includes('pcie 5.1')) {
    atxPts = ATX.ATX3_1;
  } else if (allText.includes('atx 3.0') || allText.includes('12vhpwr') || allText.includes('pcie 5.0') || allText.includes('pcie gen 5')) {
    atxPts = ATX.ATX3_0;
  }

  // 2. Gestión de Cables / Modularidad (4000 pts)
  let modPts = MODULARIDAD.NON;
  if (allText.includes('full-modular') || allText.includes('fully modular') || allText.includes('100% modular')) {
    modPts = MODULARIDAD.FULL;
  } else if (allText.includes('semi-modular') || allText.includes('semi modular')) {
    modPts = MODULARIDAD.SEMI;
  }

  const totalPoints = atxPts + modPts;
  return formatNoteScore(Math.min(10, (totalPoints / TOTAL_POINTS) * 10));
};