/**
 * RAM PRODUCTIVITY SCORE CALCULATOR
 */

import { RAM_CONFIG } from '../../config/ram';
import { formatNoteScore } from '../../../shared/helpers';
import { safeExtract } from '../../../shared/validators';

function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export const calculateProductivityScore = (product: any): number => {
  const specs = parseJsonbString(product?.specs || '{}');
  
  // 1. Capacidad de trabajo pesado (6000 pts)
  const capacity = safeExtract(specs?.capacity, 0);
  const capPoints = Math.min(capacity, RAM_CONFIG.PRODUCTIVIDAD.CAPACIDAD.MAX_GB) / RAM_CONFIG.PRODUCTIVIDAD.CAPACIDAD.MAX_GB * RAM_CONFIG.PRODUCTIVIDAD.CAPACIDAD.POINTS;
  
  // 2. Flujo de datos (4000 pts)
  const speed = safeExtract(specs?.speed, 0);
  const freqPoints = Math.min(speed, RAM_CONFIG.PRODUCTIVIDAD.FLUJO.MAX_MHZ) / RAM_CONFIG.PRODUCTIVIDAD.FLUJO.MAX_MHZ * RAM_CONFIG.PRODUCTIVIDAD.FLUJO.POINTS;
  
  const totalPoints = capPoints + freqPoints;
  return formatNoteScore(Math.min(10, (totalPoints / RAM_CONFIG.PRODUCTIVIDAD.TOTAL_POINTS) * 10));
};