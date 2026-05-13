/**
 * CPU TECHNOLOGIES SCORE CALCULATOR
 * Calcula la nota de tecnologías para CPU
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeArrayLength } from '../../utils/validators';

export const calculateTechnologiesScore = (product: any): number => {
  // Arquitectura
  const arch = product?.specs?.architecture || '';
  const archScore = getArchitectureScore(arch);
  
  // Tecnologías
  const techCount = safeArrayLength(product?.technologies || []);
  
  // Ponderación: 60% arquitectura, 40% cantidad de tecnologías
  const score = (archScore * 0.6) + (techCount * 0.4);
  
  return formatNoteScore(score);
};

function getArchitectureScore(arch: string): number {
  const scores: Record<string, number> = {
    'alder lake': 9, 'zen 4': 9, 'zen 5': 10,
    'zen 3': 8, 'zen 2': 7,
    'skylake': 8, 'haswell': 7, 'broadwell': 6,
  };
  return scores[arch.toLowerCase()] || 7.5;
}
