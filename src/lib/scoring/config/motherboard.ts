/**
 * MOTHERBOARD CONFIGURATION
 * Pesos y techos para cálculo de notas Motherboard
 */

export const MOTHERBOARD_CONFIG = {
  // Benchmarks
  WEIGHTS: {
    vrmThermal: 2000,
    bootTime: 1500,
  },
  // Techos de benchmarks
  MAX_VALUES: {
    vrmThermal: 10,
    bootTime: 5,
  },
  // Specs
  WEIGHTS_SPECS: {
    vrmQuality: 2000,
    powerPhases: 1500,
    pcieSlots: 1000,
  },
  // Techos de specs
  MAX_VALUES_SPECS: {
    vrmQuality: 10,
    powerPhases: 24,
    pcieSlots: 3,
  },
  // Puntos totales
  TOTAL_BENCHMARK_POINTS: 3500,
  TOTAL_SPECS_POINTS: 4500,
  MAX_POINTS: 8000,
};
