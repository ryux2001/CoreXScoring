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
  // 1. Calcular las 5 notas técnicas
  const speed = calculateSpeedScore(product);
  const technologies = calculateTechnologiesScore(product);
  const latency = calculateLatencyScore(product);
  const games = calculateGamesScore(product);
  const productivity = calculateProductivityScore(product);
  
  // 2. Calcular el valor usando el objeto de notas
  const valueScore = calculateValueScore(
    {
      VELOCIDAD: speed,
      TECNOLOGIAS: technologies,
      LATENCIA: latency,
      JUEGOS: games,
      PRODUCTIVIDAD: productivity,
    },
    evaluatedPrice,
    product
  );

  return {
    "Velocidad": speed,
    "Tecnologías": technologies,
    "Latencia": latency,
    // Gaming is the single public label. Legacy readers still accept Juegos
    // when loading previously persisted scores.
    "Gaming": games,
    "Productividad": productivity,
    "Calidad precio": valueScore,
  };
};
