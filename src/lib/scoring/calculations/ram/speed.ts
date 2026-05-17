/**
 * RAM SPEED SCORE CALCULATOR
 */

import { RAM_CONFIG } from '../../config/ram';
import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export const calculateSpeedScore = (product: any): number => {
  const benchmarks = parseJsonbString(product?.benchmarks || '{}');
  const specs = parseJsonbString(product?.specs || '{}');
  
  // 1. Frecuencia (5000 pts)
  const speed = safeExtract(specs?.speed, 0);
  const freqPoints = Math.min(speed, RAM_CONFIG.VELOCIDAD.FRECUENCIA.MAX_MHZ) / RAM_CONFIG.VELOCIDAD.FRECUENCIA.MAX_MHZ * RAM_CONFIG.VELOCIDAD.FRECUENCIA.POINTS;
  
  // 2. Ancho de Banda (5000 pts)
  const readSpeed = safeExtract(benchmarks?.read_speed, 0);
  const writeSpeed = safeExtract(benchmarks?.write_speed, 0);
  const avgBandwidth = (readSpeed + writeSpeed) / 2;
  const bandPoints = Math.min(avgBandwidth, RAM_CONFIG.VELOCIDAD.ANCHO_BANDA.MAX_GBPS) / RAM_CONFIG.VELOCIDAD.ANCHO_BANDA.MAX_GBPS * RAM_CONFIG.VELOCIDAD.ANCHO_BANDA.POINTS;
  
  const totalPoints = freqPoints + bandPoints;
  return formatNoteScore(Math.min(10, (totalPoints / RAM_CONFIG.VELOCIDAD.TOTAL_POINTS) * 10));
};