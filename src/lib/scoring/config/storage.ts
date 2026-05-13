/**
 * STORAGE CONFIGURATION
 * Pesos y techos para cálculo de notas Storage
 */

export const STORAGE_CONFIG = {
  // Benchmarks
  WEIGHTS: {
    readSpeed: 2000,
    writeSpeed: 2000,
    maxTemp: 1000,
  },
  // Techos de benchmarks
  MAX_VALUES: {
    readSpeed: 20000,
    writeSpeed: 20000,
    maxTemp: 50,
  },
  // Specs
  WEIGHTS_SPECS: {
    readSpeed: 1500,
    writeSpeed: 1500,
    tbw: 1000,
  },
  // Techos de specs
  MAX_VALUES_SPECS: {
    readSpeed: 20000,
    writeSpeed: 20000,
    tbw: 1000,
  },
  // Puntos totales
  TOTAL_BENCHMARK_POINTS: 5000,
  TOTAL_SPECS_POINTS: 4000,
  MAX_POINTS: 9000,
};
