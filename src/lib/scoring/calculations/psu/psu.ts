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
  return {
    "Estabilidad Eléctrica": calculateStabilityScore(product),
    "Conectividad": calculateConnectivityScore(product),
    "Protecciones": calculateProtectionsScore(product),
    "Construcción": calculateBuildQualityScore(product),
    "Eficiencia": calculateEfficiencyScore(product),
    "Calidad Precio": calculateValueScore(product, evaluatedPrice),
  };
};
