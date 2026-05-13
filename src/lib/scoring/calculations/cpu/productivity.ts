/**
 * CPU PRODUCTIVITY SCORE CALCULATOR
 * Calcula la nota de productividad para CPU
 */

import { formatNoteScore } from '../../utils/helpers';
import { kbToMb } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateProductivityScore = (product: any): number => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  // Extraer datos relevantes para productividad
  const cinebench = safeExtract(benchmarks?.cinebench_multi, 0);
  const cacheMB = kbToMb(safeExtract(specs?.cache?.l3, 0));
  const threads = parseInt(specs?.threads || '0', 10);
  
  // Productividad se mide por Cinebench (multithread) + cache + hilos
  const score = (cinebench * 0.5) + (cacheMB * 0.3) + (threads * 0.2);
  
  return formatNoteScore(score);
};
