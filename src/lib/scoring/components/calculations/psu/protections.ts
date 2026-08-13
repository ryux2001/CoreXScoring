/**
 * PSU PROTECTIONS SCORE CALCULATOR
 */

import { PSU_CONFIG } from '../../config/psu';
import { formatNoteScore } from '../../../shared/helpers';

function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export const calculateProtectionsScore = (product: any): number => {
  const specs = parseJsonbString(product?.specs || '{}');
  
  const protectionsArray = Array.isArray(specs?.protections) ? specs.protections.map((p: string) => p.toUpperCase()) : [];
  
  const { VITALES, EXTRA, TOTAL_POINTS } = PSU_CONFIG.PROTECCIONES;

  // 1. Las 6 Protecciones Vitales (7500 pts)
  let vitalCount = 0;
  VITALES.LIST.forEach(prot => {
    if (protectionsArray.includes(prot)) vitalCount++;
  });
  const vitalPts = (vitalCount / VITALES.TOTAL_REQUIRED) * VITALES.MAX_POINTS;

  // 2. Protecciones Industriales / Secundarias (2500 pts)
  let extraCount = 0;
  EXTRA.LIST.forEach(prot => {
    if (protectionsArray.includes(prot)) extraCount++;
  });
  const extraPts = Math.min(EXTRA.MAX_POINTS, extraCount * EXTRA.POINTS_PER);

  const totalPoints = vitalPts + extraPts;
  return formatNoteScore(Math.min(10, (totalPoints / TOTAL_POINTS) * 10));
};