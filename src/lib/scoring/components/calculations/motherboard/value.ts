/**
 * MOTHERBOARD VALUE SCORE CALCULATOR
 */

import { MOTHERBOARD_CONFIG } from '../../config/motherboard';
import { formatNoteScore } from '../../../shared/helpers';

export const calculateValueScore = (notes: any, evaluatedPrice: number, product: any): number => {
  const {
    ESTABILIDAD,
    EXPANSION,
    CONECTIVIDAD,
    COMPATIBILIDAD,
    TECNOLOGIAS,
  } = MOTHERBOARD_CONFIG.VALUE_WEIGHTS;

  // 1. Calcular nota global ponderada
  const globalScore = 
    (notes.ESTABILIDAD * (ESTABILIDAD / 100)) +
    (notes.EXPANSION * (EXPANSION / 100)) +
    (notes.CONECTIVIDAD * (CONECTIVIDAD / 100)) +
    (notes.COMPATIBILIDAD * (COMPATIBILIDAD / 100)) +
    (notes.TECNOLOGIAS * (TECNOLOGIAS / 100));

  // 2. Control de seguridad precio
  if (!evaluatedPrice || evaluatedPrice <= 0) {
    return 0;
  }

  // 3. Umbral de Rendimiento Útil (-3.5 pts)
  const usefulPerformance = Math.max(0, globalScore - 3.5);

  // 4. Calcular ratio y normalizar contra techo (0.025)
  const ratio = usefulPerformance / evaluatedPrice;
  const valueScore = (ratio / MOTHERBOARD_CONFIG.VALUE_CEILING) * 10;

  return formatNoteScore(Math.min(10, valueScore));
};