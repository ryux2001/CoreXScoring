export const GPU_VALUE_PROFILE_EVENT = 'updateGpuValueProfile';

export const GPU_VALUE_PROFILE_OPTIONS = [
  {
    value: 'balanced',
    label: 'Equilibrada',
    description: 'Rendimiento general para decidir con una visión amplia.',
  },
  {
    value: 'gaming',
    label: 'Gaming',
    description: 'Da más peso a rasterización, Ray Tracing y tecnologías de juego.',
  },
  {
    value: 'creation',
    label: 'Creación',
    description: 'Prioriza productividad, memoria y eficiencia para cargas creativas.',
  },
] as const;

export type GpuValueProfile = (typeof GPU_VALUE_PROFILE_OPTIONS)[number]['value'];

export type GpuEvaluationNotes = {
  rasterization: number;
  rayTracing: number;
  productivity: number;
  memory: number;
  efficiency: number;
  software: number;
};

export const GPU_VALUE_WEIGHTS: Record<GpuValueProfile, GpuEvaluationNotes> = {
  balanced: {
    rasterization: 0.3,
    rayTracing: 0.2,
    productivity: 0.2,
    memory: 0.15,
    efficiency: 0.1,
    software: 0.05,
  },
  gaming: {
    rasterization: 0.45,
    rayTracing: 0.25,
    productivity: 0,
    memory: 0.15,
    efficiency: 0.1,
    software: 0.05,
  },
  creation: {
    rasterization: 0,
    rayTracing: 0.1,
    productivity: 0.55,
    memory: 0.2,
    efficiency: 0.05,
    software: 0.1,
  },
};

export function isGpuValueProfile(value: unknown): value is GpuValueProfile {
  return GPU_VALUE_PROFILE_OPTIONS.some((option) => option.value === value);
}
