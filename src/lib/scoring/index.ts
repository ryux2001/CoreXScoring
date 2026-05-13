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
import { ComponentNotes } from './types';

export const getComponentNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  const type = product?.type?.toUpperCase();

  switch (type) {
    case 'CPU':
      return calculateCpuNotes(product, evaluatedPrice);
    case 'GPU':
      return calculateGpuNotes(product, evaluatedPrice);
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
