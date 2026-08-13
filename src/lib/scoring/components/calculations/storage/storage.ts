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
  // 1. Calcular notas técnicas
  const speed = calculateSpeedScore(product);
  const technologies = calculateTechnologiesScore(product);
  const temperatures = calculateTemperaturesScore(product);
  const durability = calculateDurabilityScore(product);
  const efficiency = calculateEfficiencyScore(product);

  // 2. Calcular el valor usando el objeto interno esperado por value.ts
  const valueScore = calculateValueScore(
    {
      VELOCIDAD: speed,
      TECNOLOGIAS: technologies,
      TEMPERATURAS: temperatures,
      DURABILIDAD: durability,
      EFICIENCIA: efficiency,
    },
    evaluatedPrice,
    product
  );

  return {
    "Velocidad": speed,
    "Tecnologías": technologies,
    "Temperaturas": temperatures,
    "Durabilidad": durability,
    "Eficiencia": efficiency,
    "Calidad precio": valueScore,
  };
};