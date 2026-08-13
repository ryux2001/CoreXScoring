/**
 * STORAGE VALUE SCORE CALCULATOR
 */

import { STORAGE_CONFIG } from '../../config/storage';
import { formatNoteScore } from '../../../shared/helpers';

export const calculateValueScore = (notes: any, evaluatedPrice: number, product: any): number => {
  const {
    VELOCIDAD_WEIGHT,
    DURABILIDAD_WEIGHT,
    TECNOLOGIAS_WEIGHT,
    TEMPERATURAS_WEIGHT,
    EFICIENCIA_WEIGHT,
  } = STORAGE_CONFIG.VALUE_WEIGHTS;

  // 1. Calcular nota global ponderada
  const globalScore = 
    (notes.VELOCIDAD * (VELOCIDAD_WEIGHT / 100)) +
    (notes.DURABILIDAD * (DURABILIDAD_WEIGHT / 100)) +
    (notes.TECNOLOGIAS * (TECNOLOGIAS_WEIGHT / 100)) +
    (notes.TEMPERATURAS * (TEMPERATURAS_WEIGHT / 100)) +
    (notes.EFICIENCIA * (EFICIENCIA_WEIGHT / 100));

  // 2. Control de seguridad precio
  if (!evaluatedPrice || evaluatedPrice <= 0) {
    return 0;
  }

  // 3. Umbral de Rendimiento Útil (-3.5)
  const usefulPerformance = Math.max(0, globalScore - 2.5);

  // 4. Calcular ratio y normalizar contra techo (0.035)
  const ratio = usefulPerformance / evaluatedPrice;
  const valueScore = (ratio / STORAGE_CONFIG.VALUE_CEILING) * 10;

  return formatNoteScore(Math.min(10, valueScore));
};