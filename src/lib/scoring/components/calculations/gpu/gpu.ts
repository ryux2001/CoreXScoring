/**
 * GPU NOTES ORCHESTRATOR
 * Keeps each visible axis independent and leaves value selection to the profile.
 */

import { calculateEfficiencyScore } from './efficiency';
import { calculateRayTracingScore } from './gaming';
import { calculateMemoryScore } from './memory';
import { calculateRasterizationScore } from './potency';
import type { GpuValueProfile } from './profiles';
import { calculateProductivityScore } from './productivity';
import { calculateTechnologiesScore } from './technologies';
import { calculateValueScore } from './value';

export type ComponentNotes = {
  [key: string]: number;
};

export const calculateGpuNotes = (
  product: any,
  evaluatedPrice: number,
  profile: GpuValueProfile = 'balanced',
): ComponentNotes => {
  const evaluationNotes = {
    rasterization: calculateRasterizationScore(product),
    rayTracing: calculateRayTracingScore(product),
    productivity: calculateProductivityScore(product),
    memory: calculateMemoryScore(product),
    efficiency: calculateEfficiencyScore(product),
    software: calculateTechnologiesScore(product),
  };

  return {
    "Rasterización": evaluationNotes.rasterization,
    "Ray Tracing": evaluationNotes.rayTracing,
    "Productividad": evaluationNotes.productivity,
    "Memoria": evaluationNotes.memory,
    "Eficiencia": evaluationNotes.efficiency,
    "Software": evaluationNotes.software,
    "Calidad precio": calculateValueScore(evaluationNotes, evaluatedPrice, product, profile),
  };
};

export function getGpuGamingScore(notes: ComponentNotes): number {
  return (
    (notes['Rasterización'] || 0) * 0.4 +
    (notes['Ray Tracing'] || 0) * 0.25 +
    (notes.Memoria || 0) * 0.15 +
    (notes.Software || 0) * 0.1 +
    (notes.Eficiencia || 0) * 0.1
  );
}
