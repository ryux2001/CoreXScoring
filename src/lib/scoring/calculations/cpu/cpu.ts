/**
 * CPU NOTES CALCULATOR
 * Importa todas las funciones de cálculo de notas para CPU
 */

import { calculatePotencyScore } from './potency';
import { calculateTechnologiesScore } from './technologies';
import { calculateProductivityScore } from './productivity';
import { calculateGamingScore } from './gaming';
import { calculateEfficiencyScore } from './efficiency';
import { calculateValueScore } from './value';

export type ComponentNotes = {
  [key: string]: number;
};

export const calculateCpuNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Potencia": calculatePotencyScore(product),
    "Tecnologías": calculateTechnologiesScore(product),
    "Productividad": calculateProductivityScore(product),
    "Juegos": calculateGamingScore(product),
    "Eficiencia": calculateEfficiencyScore(product),
    "Calidad precio": calculateValueScore(product, evaluatedPrice),
  };
};
