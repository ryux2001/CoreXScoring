/**
 * MOTHERBOARD NOTES CALCULATOR
 * Importa todas las funciones de cálculo de notas para Motherboard
 */

import { calculateConnectivityScore } from './connectivity';
import { calculateTechnologiesScore } from './technologies';
import { calculateBuildQualityScore } from './build_quality';
import { calculateCompatibilityScore } from './compatibility';
import { calculateElectricalStabilityScore } from './electrical_stability';
import { calculateValueScore } from './value';

export type ComponentNotes = {
  [key: string]: number;
};

export const calculateMotherboardNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Conectividad": calculateConnectivityScore(product),
    "Tecnologías": calculateTechnologiesScore(product),
    "Construcción": calculateBuildQualityScore(product),
    "Compatibilidad": calculateCompatibilityScore(product),
    "Estabilidad": calculateElectricalStabilityScore(product),
    "Calidad precio": calculateValueScore(product, evaluatedPrice),
  };
};
