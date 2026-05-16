/**
 * CPU VALUE SCORE CALCULATOR
 * Calcula la nota de calidad precio para CPU
 * Usa las 5 notas previas (potencia, tecnologias, productividad, juegos, eficiencia)
 * y las pondera según CPU_CONFIG.VALUE_WEIGHTS
 */

import { CPU_CONFIG } from '../../config/cpu';
import { formatNoteScore } from '../../utils/helpers';

export const calculateValueScore = (notes: any, evaluatedPrice: number, product: any): number => {
  // 1. Pesos de cada nota (deben sumar 100%)
  const {
    POTENCIA_WEIGHT: potenciaPeso,
    TECNOLOGIAS_WEIGHT: tecnologiasPeso,
    PRODUCTIVIDAD_WEIGHT: productividadPeso,
    JUEGOS_WEIGHT: juegosPeso,
    EFICIENCIA_WEIGHT: eficienciaPeso,
  } = CPU_CONFIG.VALUE_WEIGHTS;
  
  // 2. Calcular nota global ponderada
  const globalNote =
    notes.POTENCIA * (potenciaPeso / 100) +
    notes.TECNOLOGIAS * (tecnologiasPeso / 100) +
    notes.PRODUCTIVIDAD * (productividadPeso / 100) +
    notes.JUEGOS * (juegosPeso / 100) +
    notes.EFICIENCIA * (eficienciaPeso / 100);
  
  // 3. El precio ya está en USD (convertido en NotesCard)
  const precioUSD = evaluatedPrice;
  
  // 4. Calcular ratio de valor (puntos por $100)
  const ratio = (globalNote / precioUSD) * 100;
  
  // 5. Normalizar a escala 0-10 (techo de 4 = perfeccion 10/10)
  const normalizedScore = (ratio / 4.0) * 10;
  
  return formatNoteScore(normalizedScore);
};
