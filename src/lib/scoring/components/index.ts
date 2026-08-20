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
import { calculateValueScore, getCpuFairPrice } from './calculations/cpu/value';
import { getGpuFairPrice } from './calculations/gpu/value';
import { getRamFairPrice } from './calculations/ram/value';
import { getStorageFairPrice } from './calculations/storage/value';
import { getMotherboardFairPrice } from './calculations/motherboard/value';
import { getPsuFairPrice } from './calculations/psu/value';
import type { ComponentNotes, CpuTechnicalNotes, GpuTechnicalNotes } from './types';
import { isGpuValueProfile, type GpuValueProfile } from './calculations/gpu/profiles';
import { isCpuValueProfile, type CpuValueProfile } from './calculations/cpu/profiles';

export type ComponentValueProfile = GpuValueProfile | CpuValueProfile;

export const getComponentNotes = (
  product: Record<string, unknown>,
  evaluatedPrice: number,
  valueProfile?: ComponentValueProfile,
): ComponentNotes => {
  const type = typeof product?.type === 'string' ? product.type.toUpperCase() : '';

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

/**
 * Return the USD fair price implied by the same technical notes used for the
 * visible component value score. Aggregate scorers sum these prices before
 * applying the shared value curve, which preserves price monotonicity.
 */
export const getComponentFairPrice = (
  product: Record<string, unknown>,
  notes: ComponentNotes,
  valueProfile?: ComponentValueProfile,
): number => {
  const type = typeof product?.type === 'string' ? product.type.toUpperCase() : '';

  switch (type) {
    case 'CPU':
      return getCpuFairPrice(
        notes as CpuTechnicalNotes,
        isCpuValueProfile(valueProfile) ? valueProfile : 'balanced',
      );
    case 'GPU':
      return getGpuFairPrice(
        notes as GpuTechnicalNotes,
        isGpuValueProfile(valueProfile) ? valueProfile : 'balanced',
      );
    case 'RAM':
      return getRamFairPrice(notes, product);
    case 'STORAGE':
      return getStorageFairPrice(notes, product);
    case 'MOTHERBOARD':
      return getMotherboardFairPrice(notes);
    case 'PSU':
      return getPsuFairPrice(notes, product);
    default:
      return 0;
  }
};

// Exportar calculateValueScore para uso en NotesCard
export { calculateValueScore };
