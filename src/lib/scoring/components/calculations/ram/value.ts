/**
 * RAM VALUE SCORE CALCULATOR
 * Utiliza la lógica de Umbral de Rendimiento Útil (-3.5 pts)
 */

import { RAM_CONFIG } from '../../config/ram';
import { formatNoteScore } from '../../../shared/helpers';

export const calculateValueScore = (notes: any, evaluatedPrice: number, product: any): number => {
  // 1. Extraer los pesos
  const {
    VELOCIDAD_WEIGHT,
    LATENCIA_WEIGHT,
    TECNOLOGIAS_WEIGHT,
    JUEGOS_WEIGHT,
    PRODUCTIVIDAD_WEIGHT,
  } = RAM_CONFIG.VALUE_WEIGHTS;
  
  // 2. Calcular la nota global ponderada (0 a 10)
  const globalScore = 
    (notes.VELOCIDAD * (VELOCIDAD_WEIGHT / 100)) +
    (notes.TECNOLOGIAS * (TECNOLOGIAS_WEIGHT / 100)) +
    (notes.LATENCIA * (LATENCIA_WEIGHT / 100)) +
    (notes.JUEGOS * (JUEGOS_WEIGHT / 100)) +
    (notes.PRODUCTIVIDAD * (PRODUCTIVIDAD_WEIGHT / 100));

  // 3. Control de seguridad
  if (!evaluatedPrice || evaluatedPrice <= 0) {
    return 0;
  }
  
  // 4. Umbral de Rendimiento Útil (-3.5)
  const usefulPerformance = Math.max(0, globalScore - 3.5);
  
  // 5. Ratio sobre precio y normalización a techo de 0.035
  const ratio = usefulPerformance / evaluatedPrice;
  const valueScore = (ratio / RAM_CONFIG.VALUE_CEILING) * 10;
  
  return formatNoteScore(Math.min(10, valueScore));
};