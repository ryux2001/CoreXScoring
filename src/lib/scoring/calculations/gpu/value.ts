/**
 * GPU VALUE SCORE CALCULATOR
 * Calcula la calidad/precio basada en las 5 notas técnicas y el precio
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
  // Calcular nota global ponderada
  const potenciaPoints = notes.POTENCIA * GPU_CONFIG.VALUE_WEIGHTS.POTENCIA_WEIGHT;
  const technologiesPoints = notes.TECNOLOGIAS * GPU_CONFIG.VALUE_WEIGHTS.TECNOLOGIAS_WEIGHT;
  const productivityPoints = notes.PRODUCTIVIDAD * GPU_CONFIG.VALUE_WEIGHTS.PRODUCTIVIDAD_WEIGHT;
  const gamingPoints = notes.JUEGOS * GPU_CONFIG.VALUE_WEIGHTS.JUEGOS_WEIGHT;
  const efficiencyPoints = notes.EFICIENCIA * GPU_CONFIG.VALUE_WEIGHTS.EFICIENCIA_WEIGHT;
  
  const totalWeightedPoints = potenciaPoints + technologiesPoints + productivityPoints + gamingPoints + efficiencyPoints;
  
  // Normalizar a 0-100
  const normalizedScore = totalWeightedPoints / 100;
  
  // Calcular calidad/precio
  // Fórmula: (nota_global_ponderada / precio_usd * 100) / 4.0 * 10
  // Con techo de 4.0 (perfección 10/10)
  let valueScore = 0;
  if (evaluatedPrice > 0) {
    valueScore = (normalizedScore / evaluatedPrice * 100) / 2.0 * 10;
  }
  
  // Aplicar techo de 10
  return Math.min(10, valueScore);
};
