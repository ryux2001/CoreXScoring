/** PSU notes orchestrator. */

import type { PsuNotes } from '../../types';
import { calculateBuildQualityScore } from './build_quality';
import { calculateConnectivityScore } from './connectivity';
import { calculateEfficiencyScore } from './efficiency';
import { calculateProtectionsScore } from './protections';
import { calculateStabilityScore } from './stability';
import { calculateValueScore } from './value';

export const calculatePsuNotes = (product: any, evaluatedPrice: number): PsuNotes => {
  const estabilidad = calculateStabilityScore(product);
  const conectividad = calculateConnectivityScore(product);
  const protecciones = calculateProtectionsScore(product);
  const construccion = calculateBuildQualityScore(product);
  const eficiencia = calculateEfficiencyScore(product);
  const valueScore = calculateValueScore(
    {
      ESTABILIDAD: estabilidad,
      CONECTIVIDAD: conectividad,
      PROTECCIONES: protecciones,
      CONSTRUCCION: construccion,
      EFICIENCIA: eficiencia,
    },
    evaluatedPrice,
    product,
  );

  return {
    'Estabilidad Eléctrica': estabilidad,
    Conectividad: conectividad,
    Protecciones: protecciones,
    Construcción: construccion,
    Eficiencia: eficiencia,
    'Calidad Precio': valueScore,
  };
};
