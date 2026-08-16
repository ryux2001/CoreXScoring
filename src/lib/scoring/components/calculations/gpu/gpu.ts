/**
 * GPU NOTES ORCHESTRATOR
 * Keeps each visible axis independent and leaves value selection to the profile.
 */

import { calculateEfficiencyV3Score } from './efficiency';
import { calculateGamingV3Score } from './gaming';
import { calculateProductivityV3Score } from './productivity';
import { calculateRasterizationV3Score } from './potency';
import type { GpuValueProfile } from './profiles';
import { calculateTechnologiesV3Score } from './technologies';
import { calculateValueScore } from './value';
import type { GpuNotes, GpuTechnicalNotes } from '../../types';

export type ComponentNotes = {
  [key: string]: number;
};

export const calculateGpuTechnicalNotes = (product: any): GpuTechnicalNotes => ({
  "Rasterización": calculateRasterizationV3Score(product),
  "Productividad": calculateProductivityV3Score(product),
  Gaming: calculateGamingV3Score(product),
  "Eficiencia": calculateEfficiencyV3Score(product),
  "Tecnologías": calculateTechnologiesV3Score(product),
});

export const calculateGpuNotes = (
  product: any,
  evaluatedPrice: number,
  profile: GpuValueProfile = 'balanced',
): GpuNotes => {
  const technicalNotes = calculateGpuTechnicalNotes(product);

  return {
    ...technicalNotes,
    "Calidad precio": calculateValueScore(technicalNotes, evaluatedPrice, product, profile),
  };
};

export function getGpuGamingScore(notes: ComponentNotes): number {
  if (typeof notes.Gaming === 'number' && Number.isFinite(notes.Gaming)) {
    return notes.Gaming;
  }

  // Compatibility for persisted/legacy build scores that predate Gaming as a
  // first-class GPU note.
  return (
    (notes['Rasterización'] || 0) * 0.45 +
    (notes['Ray Tracing'] || 0) * 0.25 +
    (notes.Memoria || 0) * 0.15 +
    (notes.Eficiencia || 0) * 0.1 +
    (notes.Software || 0) * 0.05
  );
}
