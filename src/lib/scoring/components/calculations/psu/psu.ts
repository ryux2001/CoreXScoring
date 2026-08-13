/**
 * PSU NOTES CALCULATOR
 * Importa todas las funciones de cálculo de notas para PSU
 */

import { calculateStabilityScore } from './stability';
import { calculateConnectivityScore } from './connectivity';
import { calculateProtectionsScore } from './protections';
import { calculateBuildQualityScore } from './build_quality';
import { calculateEfficiencyScore } from './efficiency';
import { calculateValueScore } from './value';

export type ComponentNotes = {
  [key: string]: number;
};

export const calculatePsuNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  // 1. Calcular notas técnicas
  const estabilidad = calculateStabilityScore(product);
  const conectividad = calculateConnectivityScore(product);
  const protecciones = calculateProtectionsScore(product);
  const construccion = calculateBuildQualityScore(product);
  const eficiencia = calculateEfficiencyScore(product);

  // 2. Calcular el valor usando el objeto interno esperado por value.ts
  const valueScore = calculateValueScore(
    {
      ESTABILIDAD: estabilidad,
      CONECTIVIDAD: conectividad,
      PROTECCIONES: protecciones,
      CONSTRUCCION: construccion,
      EFICIENCIA: eficiencia,
    },
    evaluatedPrice,
    product
  );

  return {
    "Estabilidad Eléctrica": estabilidad,
    "Conectividad": conectividad,
    "Protecciones": protecciones,
    "Construcción": construccion,
    "Eficiencia": eficiencia,
    "Calidad Precio": valueScore,
  };
};