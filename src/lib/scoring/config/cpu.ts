/**
 * CPU CONFIGURATION
 * Pesos y techos para cálculo de notas CPU
 */

export const CPU_CONFIG = {
  // Benchmarks (70% de 10000 = 7000 pts)
  WEIGHTS: {
    cinebench: 3500,   // 50% de 7000
    geekbench: 2100,   // 30% de 7000
    passmark: 1400,    // 20% de 7000
  },
  // Techos de benchmarks
  MAX_VALUES: {
    cinebench: 50000,
    geekbench: 3600,
    passmark: 80000,
  },
  // Specs (30% de 10000 = 3000 pts)
  WEIGHTS_SPECS: {
    turbo: 1200,      // 40% de 3000
    threads: 900,     // 30% de 3000
    cache: 900,       // 30% de 3000
  },
  // Techos de specs
  MAX_VALUES_SPECS: {
    turbo: 6.2,       // GHz
    threads: 32,
    cache: 150,       // MB
  },
  // Puntos totales
  TOTAL_BENCHMARK_POINTS: 7000,
  TOTAL_SPECS_POINTS: 3000,
  MAX_POINTS: 10000,
};
