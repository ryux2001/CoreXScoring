/**
 * RAM NOTES CALCULATOR
 * Importa todas las funciones de cálculo de notas para RAM
 */

import { calculateSpeedScore } from './speed';
import { calculateTechnologiesScore } from './technologies';
import { calculateLatencyScore } from './latency';
import { calculateCompatibilityScore } from './compatibility';
import { calculateEfficiencyScore } from './efficiency';
import { calculateValueScore } from './value';

export type ComponentNotes = {
  [key: string]: number;
};

export const calculateRamNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Velocidad": calculateSpeedScore(product),
    "Tecnologías": 7.5,
    "Latencia": calculateLatencyScore(product),
    "Compatibilidad": calculateCompatibilityScore(product),
    "Eficiencia": calculateEfficiencyScore(product),
    "Calidad precio": calculateValueScore(product, evaluatedPrice),
  };
};
