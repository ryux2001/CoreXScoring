/**
 * CPU VALUE SCORE CALCULATOR
 * Calcula la nota de calidad precio para CPU
 * Usa las 5 notas previas (potencia, tecnologias, productividad, juegos, eficiencia)
 * y las pondera según CPU_CONFIG.VALUE_WEIGHTS utilizando el Umbral de Rendimiento Útil
 */

import { CPU_CONFIG } from '../../config/cpu';
import { formatNoteScore } from '../../../shared/helpers';

export const calculateValueScore = (notes: any, evaluatedPrice: number, product: any): number => {
  // 1. Pesos de cada nota (deben sumar 100%)
  const {
    POTENCIA_WEIGHT: potenciaPeso,
    TECNOLOGIAS_WEIGHT: tecnologiasPeso,
    PRODUCTIVIDAD_WEIGHT: productividadPeso,
    JUEGOS_WEIGHT: juegosPeso,
    EFICIENCIA_WEIGHT: eficienciaPeso,
  } = CPU_CONFIG.VALUE_WEIGHTS;
  
  // 2. Calcular nota global ponderada (Escala de 0 a 10)
  const globalScore =
    notes.POTENCIA * (potenciaPeso / 100) +
    notes.TECNOLOGIAS * (tecnologiasPeso / 100) +
    notes.PRODUCTIVIDAD * (productividadPeso / 100) +
    notes.JUEGOS * (juegosPeso / 100) +
    notes.EFICIENCIA * (eficienciaPeso / 100);
  
  // Control de seguridad: Si no hay precio registrado o es menor/igual a 0, la nota es 0
  if (!evaluatedPrice || evaluatedPrice <= 0) {
    return 0;
  }
  
  // 3. Aplicar el Umbral de Rendimiento Útil (Restar 3.5 puntos base)
  // Math.max(0, ...) evita que procesadores muy antiguos o básicos devuelvan rendimiento negativo
  const usefulPerformance = Math.max(0, globalScore - 3.5);
  
  // 4. Calcular el Ratio de puntos útiles por dólar
  const ratio = usefulPerformance / evaluatedPrice;
  
  // 5. Normalizar contra el techo adaptado de CPU (0.012 pts por dólar) para obtener escala 0-10
  const maxCeiling = 0.012;
  const valueScore = (ratio / maxCeiling) * 10;
  
  // Retornar la nota final limitada a un máximo de 10 y procesada por tu formateador
  return formatNoteScore(Math.min(10, valueScore));
};