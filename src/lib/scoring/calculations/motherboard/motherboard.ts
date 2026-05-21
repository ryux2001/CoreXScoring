/**
 * MOTHERBOARD NOTES CALCULATOR
 * Importa todas las funciones de cálculo de notas para Motherboard
 */

import { calculateElectricalStabilityScore } from './electrical_stability';
import { calculateInternalExpansionScore } from './internal_expansion';
import { calculateConnectivityScore } from './connectivity';
import { calculateTechnologiesScore } from './technologies';
import { calculateCompatibilityScore } from './compatibility';
import { calculateValueScore } from './value';

export type ComponentNotes = {
  [key: string]: number;
};

export const calculateMotherboardNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  // 1. Calcular notas técnicas
  const estabilidad = calculateElectricalStabilityScore(product);
  const expansion = calculateInternalExpansionScore(product);
  const conectividad = calculateConnectivityScore(product);
  const tecnologias = calculateTechnologiesScore(product);
  const compatibilidad = calculateCompatibilityScore(product);

  // 2. Calcular el valor calidad/precio usando los pesos y el umbral 3.5
  const valueScore = calculateValueScore(
    {
      ESTABILIDAD: estabilidad,
      EXPANSION: expansion,
      CONECTIVIDAD: conectividad,
      TECNOLOGIAS: tecnologias,
      COMPATIBILIDAD: compatibilidad,
    },
    evaluatedPrice,
    product
  );

  return {
    "Estabilidad": estabilidad,
    "Expansión": expansion,
    "Conectividad": conectividad,
    "Tecnologías": tecnologias,
    "Compatibilidad": compatibilidad,
    "Calidad precio": valueScore,
  };
};