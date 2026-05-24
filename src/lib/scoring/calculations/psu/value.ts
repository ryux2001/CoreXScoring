/**
 * PSU VALUE SCORE CALCULATOR
 */

import { PSU_CONFIG } from '../../config/psu';
import { formatNoteScore } from '../../utils/helpers';

export const calculateValueScore = (notes: any, evaluatedPrice: number, product: any): number => {
  const {
    ESTABILIDAD,
    PROTECCIONES,
    EFICIENCIA,
    CONSTRUCCION,
    CONECTIVIDAD,
  } = PSU_CONFIG.VALUE_WEIGHTS;

  // 1. Calcular nota global ponderada
  const globalScore = 
    (notes.ESTABILIDAD * (ESTABILIDAD / 100)) +
    (notes.PROTECCIONES * (PROTECCIONES / 100)) +
    (notes.EFICIENCIA * (EFICIENCIA / 100)) +
    (notes.CONSTRUCCION * (CONSTRUCCION / 100)) +
    (notes.CONECTIVIDAD * (CONECTIVIDAD / 100));

  // 2. Control de seguridad precio
  if (!evaluatedPrice || evaluatedPrice <= 0) {
    return 0;
  }

  // 3. Umbral de Rendimiento Útil (-3.5 pts)
  const usefulPerformance = Math.max(0, globalScore - 3.5);

  // 4. Calcular ratio y normalizar contra techo (0.05)
  const ratio = usefulPerformance / evaluatedPrice;
  const valueScore = (ratio / PSU_CONFIG.VALUE_CEILING) * 10;

  return formatNoteScore(Math.min(10, valueScore));
};