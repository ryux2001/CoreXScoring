/**
 * CPU TECHNOLOGIES SCORE CALCULATOR
 * Calcula la nota de tecnologías para CPU
 * Importa el cálculo desde el utility central
 */

import { calculateTechnologiesScore as extractTechnologiesScore } from '../../utils/technology-extractor';
import { formatNoteScore } from '../../utils/helpers';

/**
 * Wrapper para mantener compatibilidad y formato
 * El cálculo real está en technology-extractor.ts
 */
export const calculateTechnologiesScore = (product: any, year: number = 2026): number => {
  // Extraer score desde el utility central
  const rawScore = extractTechnologiesScore(product, year);
  
  // Formatear resultado final (0-10)
  return formatNoteScore(rawScore);
};
