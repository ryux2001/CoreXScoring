/**
 * PSU CONFIGURATION
 * Pesos y techos para cálculo de notas PSU
 */

export const PSU_CONFIG = {
  // Benchmarks
  WEIGHTS: {
    noiseLevel: 1000,
    efficiency50: 2000,
  },
  // Techos de benchmarks
  MAX_VALUES: {
    noiseLevel: 15,
    efficiency50: 100,
  },
  // Specs
  WEIGHTS_SPECS: {
    wattage: 1500,
    efficiency: 1500,
    protections: 1000,
  },
  // Techos de specs
  MAX_VALUES_SPECS: {
    wattage: 1600,
    efficiency: 95,
    protections: 12,
  },
  // Puntos totales
  TOTAL_BENCHMARK_POINTS: 3000,
  TOTAL_SPECS_POINTS: 4000,
  MAX_POINTS: 7000,
};
