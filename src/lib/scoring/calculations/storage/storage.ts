/**
 * STORAGE NOTES CALCULATOR
 * Importa todas las funciones de cálculo de notas para Storage
 */

import { calculateSpeedScore } from './speed';
import { calculateTechnologiesScore } from './technologies';
import { calculateTemperaturesScore } from './temperatures';
import { calculateDurabilityScore } from './durability';
import { calculateEfficiencyScore } from './efficiency';
import { calculateValueScore } from './value';

export type ComponentNotes = {
  [key: string]: number;
};

export const calculateStorageNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Velocidad": calculateSpeedScore(product),
    "Tecnologías": calculateTechnologiesScore(product),
    "Temperaturas": calculateTemperaturesScore(product),
    "Durabilidad": calculateDurabilityScore(product),
    "Eficiencia": calculateEfficiencyScore(product),
    "Calidad Precio": calculateValueScore(product, evaluatedPrice),
  };
};
