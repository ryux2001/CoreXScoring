/**
 * CPU NOTES CALCULATOR
 * Importa todas las funciones de cálculo de notas para CPU
 */

import { calculatePotencyScore, calculatePotencyV3Score } from './potency';
import { calculateTechnologiesScore } from './technologies';
import { calculateProductivityScore, calculateProductivityV3Score } from './productivity';
import { calculateGamingScore, calculateGamingV3Score } from './gaming';
import { calculateEfficiencyScore, calculateEfficiencyV3Score } from './efficiency';
import { calculatePlatformV3Score } from './platform';
import { calculateValueScore } from './value';
import type { CpuNotes, CpuTechnicalNotes } from '../../types';

export type ComponentNotes = {
  [key: string]: number;
};

export const calculateCpuTechnicalNotes = (product: any): CpuTechnicalNotes => ({
  "Potencia": calculatePotencyV3Score(product),
  "Productividad": calculateProductivityV3Score(product),
  Gaming: calculateGamingV3Score(product),
  "Eficiencia": calculateEfficiencyV3Score(product),
  "Plataforma": calculatePlatformV3Score(product),
});

export const calculateCpuNotes = (product: any, evaluatedPrice: number): CpuNotes => {
  const technicalNotes = calculateCpuTechnicalNotes(product);

  // Keep quality-price on its current formula until that axis is recalibrated
  // separately. Legacy notes are intentionally isolated from the visible v3
  // notes so changing the five technical axes does not change its score yet.
  const legacyNotes = {
    POTENCIA: calculatePotencyScore(product),
    TECNOLOGIAS: calculateTechnologiesScore(product),
    PRODUCTIVIDAD: calculateProductivityScore(product),
    JUEGOS: calculateGamingScore(product),
    EFICIENCIA: calculateEfficiencyScore(product),
  };

  const valueScore = calculateValueScore(
    legacyNotes,
    evaluatedPrice,
    product,
  );

  return {
    ...technicalNotes,
    "Calidad precio": valueScore,
  };
};

export function getCpuGamingScore(notes: ComponentNotes): number {
  const gaming = notes.Gaming ?? notes['Juegos'];
  return typeof gaming === 'number' && Number.isFinite(gaming) ? gaming : 0;
}
