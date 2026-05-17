/**
 * RAM NOTES CALCULATOR
 * Importa todas las funciones de cálculo de notas para RAM
 */

import { calculateSpeedScore } from './speed';
import { calculateTechnologiesScore } from './technologies';
import { calculateLatencyScore } from './latency';
import { calculateGamesScore } from './games';
import { calculateProductivityScore } from './productivity';
import { calculateValueScore } from './value';

export type ComponentNotes = {
  [key: string]: number;
};

export const calculateRamNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Velocidad": calculateSpeedScore(product),
    "Tecnologías": 7.5,
    "Latencia": calculateLatencyScore(product),
    "Juegos": calculateGamesScore(product),
    "Productividad": calculateProductivityScore(product),
    "Calidad precio": calculateValueScore(product, evaluatedPrice),
  };
};
