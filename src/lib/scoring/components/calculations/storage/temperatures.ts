/**
 * STORAGE TEMPERATURES SCORE CALCULATOR
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

export const calculateTemperaturesScore = (product: any): number => {
  const benchmarks = parseJsonbString(product?.benchmarks || '{}');
  const specs = parseJsonbString(product?.specs || '{}');
  
  const maxTemp = safeExtract(benchmarks?.max_temp_c, 85); // Si no hay datos, asumimos 85C (peor caso)
  // Usamos CrystalDisk Read prioritario, si no, tomamos el teórico
  const readSpeed = safeExtract(benchmarks?.crystal_disk_read, safeExtract(specs?.read_speed, 1));
  
  const { SEGURIDAD, EFICIENCIA, TOTAL_POINTS } = STORAGE_CONFIG.TEMPERATURAS;

  // 1. Seguridad Térmica Bruta (5000 pts)
  let securityPoints = 0;
  if (maxTemp <= SEGURIDAD.MIN_TEMP) {
    securityPoints = SEGURIDAD.MAX_POINTS;
  } else if (maxTemp < SEGURIDAD.MAX_TEMP) {
    securityPoints = ((SEGURIDAD.MAX_TEMP - maxTemp) / SEGURIDAD.RANGE) * SEGURIDAD.MAX_POINTS;
  }

  // 2. Eficiencia Térmica (5000 pts)
  let efficiencyPoints = 0;
  if (maxTemp > 0) {
    const ratio = readSpeed / maxTemp;
    efficiencyPoints = Math.min(EFICIENCIA.MAX_POINTS, (ratio / EFICIENCIA.PERFECT_RATIO) * EFICIENCIA.MAX_POINTS);
  }

  const totalPoints = securityPoints + efficiencyPoints;
  
  return formatNoteScore(Math.min(10, (totalPoints / TOTAL_POINTS) * 10));
};