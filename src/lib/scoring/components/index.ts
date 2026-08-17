/**
 * SCORING ORCHESTRATOR
 * Punto único de entrada para obtener notas de cualquier componente
 */

import { calculateCpuNotes } from './calculations/cpu/cpu';
import { calculateGpuNotes } from './calculations/gpu/gpu';
import { calculateRamNotes } from './calculations/ram/ram';
import { calculateStorageNotes } from './calculations/storage/storage';
import { calculateMotherboardNotes } from './calculations/motherboard/motherboard';
import { calculatePsuNotes } from './calculations/psu/psu';
import { calculateValueScore } from './calculations/cpu/value';
import { ComponentNotes } from './types';
import { isGpuValueProfile, type GpuValueProfile } from './calculations/gpu/profiles';
import { isCpuValueProfile, type CpuValueProfile } from './calculations/cpu/profiles';

export type ComponentValueProfile = GpuValueProfile | CpuValueProfile;

export const getComponentNotes = (
  product: any,
  evaluatedPrice: number,
  valueProfile?: ComponentValueProfile,
): ComponentNotes => {
  const type = product?.type?.toUpperCase();

  switch (type) {
    case 'CPU':
      return calculateCpuNotes(
        product,
        evaluatedPrice,
        isCpuValueProfile(valueProfile) ? valueProfile : 'balanced',
      );
    case 'GPU':
      return calculateGpuNotes(
        product,
        evaluatedPrice,
        isGpuValueProfile(valueProfile) ? valueProfile : 'balanced',
      );
    case 'RAM':
      return calculateRamNotes(product, evaluatedPrice);
    case 'STORAGE':
      return calculateStorageNotes(product, evaluatedPrice);
    case 'MOTHERBOARD':
      return calculateMotherboardNotes(product, evaluatedPrice);
    case 'PSU':
      return calculatePsuNotes(product, evaluatedPrice);
    default:
      // Valor por defecto para componentes desconocidos
      return {
        "Rendimiento": 7.5,
        "Características": 7.5,
        "Construcción": 7.5,
        "Eficiencia": 7.5,
        "Calidad precio": 7.5,
      };
  }
};

// Exportar calculateValueScore para uso en NotesCard
export { calculateValueScore };
