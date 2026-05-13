/**
 * GPU CONFIGURATION
 * Pesos y techos para cálculo de notas GPU
 */

export const GPU_CONFIG = {
  // Benchmarks
  WEIGHTS: {
    fps1080: 2500,
    fps1440: 2500,
    fps4k: 1000,
    blender: 1500,
    rayTracing: 500,
  },
  // Techos de benchmarks
  MAX_VALUES: {
    fps1080: 300,
    fps1440: 240,
    fps4k: 120,
    blender: 8000,
    rayTracing: 10, // veryhigh
  },
  // Specs
  WEIGHTS_SPECS: {
    cudaCores: 2000,
    vram: 1500,
    coreClock: 1500,
  },
  // Techos de specs
  MAX_VALUES_SPECS: {
    cudaCores: 16000,
    vram: 24,
    coreClock: 3000,
  },
  // Puntos totales
  TOTAL_BENCHMARK_POINTS: 8000,
  TOTAL_SPECS_POINTS: 2000,
  MAX_POINTS: 10000,
};
