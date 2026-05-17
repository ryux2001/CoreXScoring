/**
 * GPU VALUE SCORE CALCULATOR
 * Calcula la calidad/precio basada en el Umbral de Rendimiento Útil
 */

import { GPU_CONFIG } from '../../config/gpu';

export const calculateValueScore = (
  notes: {
    POTENCIA: number;
    TECNOLOGIAS: number;
    PRODUCTIVIDAD: number;
    JUEGOS: number;
    EFICIENCIA: number;
  },
  evaluatedPrice: number,
  product: any
): number => {
  // 1. Calcular la Nota Global Ponderada según los nuevos pesos de GPU_CONFIG
  const potenciaPoints = notes.POTENCIA * GPU_CONFIG.VALUE_WEIGHTS.POTENCIA_WEIGHT;
  const technologiesPoints = notes.TECNOLOGIAS * GPU_CONFIG.VALUE_WEIGHTS.TECNOLOGIAS_WEIGHT;
  const productivityPoints = notes.PRODUCTIVIDAD * GPU_CONFIG.VALUE_WEIGHTS.PRODUCTIVIDAD_WEIGHT;
  const gamingPoints = notes.JUEGOS * GPU_CONFIG.VALUE_WEIGHTS.JUEGOS_WEIGHT;
  const efficiencyPoints = notes.EFICIENCIA * GPU_CONFIG.VALUE_WEIGHTS.EFICIENCIA_WEIGHT;
  
  const totalWeightedPoints = potenciaPoints + technologiesPoints + productivityPoints + gamingPoints + efficiencyPoints;
  
  // Nota Global en escala de 0 a 10
  const globalScore = totalWeightedPoints / 100;
  
  // Control de seguridad: Si no hay precio registrado o es menor/igual a 0, la nota es 0
  if (!evaluatedPrice || evaluatedPrice <= 0) {
    return 0;
  }

  // 2. Aplicar el Umbral de Rendimiento Útil (Restar 3.5 puntos base)
  // Math.max(0, ...) asegura que si una gráfica rinde menos de 3.5, no devuelva valores negativos
  const usefulPerformance = Math.max(0, globalScore - 3.5);
  
  // 3. Calcular el Ratio de puntos útiles por dólar
  const ratio = usefulPerformance / evaluatedPrice;
  
  // 4. Normalizar contra el techo de perfección (0.005 pts por dólar) para obtener escala 0-10
  const maxCeiling = 0.005;
  const valueScore = (ratio / maxCeiling) * 10;
  
  // Retornar la nota limitándola estrictamente a un máximo de 10
  return Math.min(10, valueScore);
};