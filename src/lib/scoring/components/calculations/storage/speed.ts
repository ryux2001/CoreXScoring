/**
 * STORAGE SPEED SCORE CALCULATOR
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

export const calculateSpeedScore = (product: any): number => {
  const benchmarks = parseJsonbString(product?.benchmarks || '{}');
  const specs = parseJsonbString(product?.specs || '{}');
  
  const readSpeed = safeExtract(specs?.read_speed, 0);
  const writeSpeed = safeExtract(specs?.write_speed, 0);
  const crystalRead = safeExtract(benchmarks?.crystal_disk_read, 0);
  const crystalWrite = safeExtract(benchmarks?.crystal_disk_write, 0);
  
  const { TEORICA, REAL, TOTAL_POINTS } = STORAGE_CONFIG.VELOCIDAD;
  
  // 1. Velocidad Teórica (5000 pts) usando raíz cuadrada
  const theoricalReadPts = Math.sqrt(Math.min(readSpeed, TEORICA.READ_MAX) / TEORICA.READ_MAX) * TEORICA.POINTS_PER;
  const theoricalWritePts = Math.sqrt(Math.min(writeSpeed, TEORICA.WRITE_MAX) / TEORICA.WRITE_MAX) * TEORICA.POINTS_PER;
  const theoricalTotal = theoricalReadPts + theoricalWritePts;

  // 2. Velocidad Real CrystalDisk (5000 pts) usando raíz cuadrada
  const realReadPts = Math.sqrt(Math.min(crystalRead, REAL.READ_MAX) / REAL.READ_MAX) * REAL.POINTS_PER;
  const realWritePts = Math.sqrt(Math.min(crystalWrite, REAL.WRITE_MAX) / REAL.WRITE_MAX) * REAL.POINTS_PER;
  const realTotal = realReadPts + realWritePts;
  
  const totalPoints = theoricalTotal + realTotal;
  
  return formatNoteScore(Math.min(10, (totalPoints / TOTAL_POINTS) * 10));
};