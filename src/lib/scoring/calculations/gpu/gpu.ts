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
  // 1. Calcular las 5 notas previas (cada una retorna de 0 a 10)
  const potency = calculatePotencyScore(product);
  const technologies = calculateTechnologiesScore(product);
  const productivity = calculateProductivityScore(product);
  const gaming = calculateGamingScore(product);
  const efficiency = calculateEfficiencyScore(product);
  
  // 2. Calcular calidad/precio con las notas ya calculadas
  const valueScore = calculateValueScore(
    {
      POTENCIA: potency,
      TECNOLOGIAS: technologies,
      PRODUCTIVIDAD: productivity,
      JUEGOS: gaming,
      EFICIENCIA: efficiency,
    },
    evaluatedPrice,
    product  // ← Pasar el objeto product completo
  );
  
  return {
    "Potencia": potency,
    "Tecnologías": technologies,
    "Productividad": productivity,
    "Juegos": gaming,
    "Eficiencia": efficiency,
    "Calidad precio": valueScore,
  };
};