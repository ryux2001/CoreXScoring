/**
 * STORAGE DURABILITY SCORE CALCULATOR
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

export const calculateDurabilityScore = (product: any): number => {
  const specs = parseJsonbString(product?.specs || '{}');
  
  const tbw = safeExtract(specs?.tbw, 0);
  const capacity = safeExtract(specs?.capacity, 1000); // Base 1TB (1000GB) por defecto para evitar divisiones por cero
  
  // Normalizar: Cuantos TBW reales soporta por cada Terabyte (1000GB)
  const capacityInTb = capacity / 1000;
  const tbwReal = capacityInTb > 0 ? tbw / capacityInTb : 0;
  
  // Calcular puntos (Techo perfecto: 800 TBW por Terabyte)
  const { PERFECT_TBW_PER_TB, TOTAL_POINTS } = STORAGE_CONFIG.DURABILIDAD;
  const points = Math.min(TOTAL_POINTS, (tbwReal / PERFECT_TBW_PER_TB) * TOTAL_POINTS);
  
  return formatNoteScore(Math.min(10, (points / TOTAL_POINTS) * 10));
};