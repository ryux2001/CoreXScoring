/**
 * GPU NOTES CALCULATOR
 * Importa todas las funciones de cálculo de notas para GPU
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

export const calculateGpuNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Potencia": calculatePotencyScore(product),
    "Tecnologías": 7.5,
    "Productividad": 7.5,
    "Juegos": 7.5,
    "Eficiencia": 7.5,
    "Calidad precio": 7.5,
  };
};
