/**
 * RAM CONFIGURATION
 * Pesos y techos para cálculo de notas RAM
 */

export const RAM_CONFIG = {
  // Benchmarks
  WEIGHTS: {
    readSpeed: 2000,
    writeSpeed: 2000,
    latency: 1500,
  },
  // Techos de benchmarks
  MAX_VALUES: {
    readSpeed: 100,
    writeSpeed: 100,
    latency: 20,
  },
  // Specs
  WEIGHTS_SPECS: {
    speed: 1500,
    latency: 1500,
  },
  // Techos de specs
  MAX_VALUES_SPECS: {
    speed: 10000,
    latency: 16,
  },
  // Puntos totales
  TOTAL_BENCHMARK_POINTS: 5500,
  TOTAL_SPECS_POINTS: 3000,
  MAX_POINTS: 8500,
};
