/**
 * CPU NOTES CALCULATOR
 * Importa todas las funciones de cálculo de notas para CPU
 */

import { calculatePotencyV3Score } from './potency';
import { calculateProductivityV3Score } from './productivity';
import { calculateGamingV3Score } from './gaming';
import { calculateEfficiencyV3Score } from './efficiency';
import { calculatePlatformV3Score } from './platform';
import { calculateValueScore } from './value';
import type { CpuValueProfile } from './profiles';
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

export const calculateCpuNotes = (
  product: any,
  evaluatedPrice: number,
  profile: CpuValueProfile = 'balanced',
): CpuNotes => {
  const technicalNotes = calculateCpuTechnicalNotes(product);

  return {
    ...technicalNotes,
    "Calidad precio": calculateValueScore(
      technicalNotes,
      evaluatedPrice,
      product,
      profile,
    ),
  };
};

export function getCpuGamingScore(notes: ComponentNotes): number {
  const gaming = notes.Gaming ?? notes['Juegos'];
  return typeof gaming === 'number' && Number.isFinite(gaming) ? gaming : 0;
}
