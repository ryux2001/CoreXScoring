/**
 * MOTHERBOARD NOTES CALCULATOR
 * Importa todas las funciones de cálculo de notas para Motherboard.
 */

import { calculateElectricalStabilityScore } from './electrical_stability';
import { calculateInternalExpansionScore } from './internal_expansion';
import { calculateConnectivityScore } from './connectivity';
import { calculateTechnologiesScore } from './technologies';
import { calculateCompatibilityScore } from './compatibility';
import { calculateValueScore } from './value';
import type { MotherboardNotes } from '../../types';

export const calculateMotherboardNotes = (product: any, evaluatedPrice: number): MotherboardNotes => {
  const estabilidad = calculateElectricalStabilityScore(product);
  const expansion = calculateInternalExpansionScore(product);
  const conectividad = calculateConnectivityScore(product);
  const tecnologias = calculateTechnologiesScore(product);
  const compatibilidad = calculateCompatibilityScore(product);

  const valueScore = calculateValueScore(
    {
      ESTABILIDAD: estabilidad,
      EXPANSION: expansion,
      CONECTIVIDAD: conectividad,
      TECNOLOGIAS: tecnologias,
      COMPATIBILIDAD: compatibilidad,
    },
    evaluatedPrice,
    product,
  );

  return {
    Estabilidad: estabilidad,
    Expansión: expansion,
    Conectividad: conectividad,
    Tecnologías: tecnologias,
    Compatibilidad: compatibilidad,
    'Calidad precio': valueScore,
  };
};
