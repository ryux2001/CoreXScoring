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
  
  // Tecnologías - 10000 pts
  // RAM (2000 pts)
  RAM_TYPES: {
    ddr5: 2000,
    ddr4: 1000,
    ddr3: 250,
  },
  // PCIe (2000 pts)
  PCIE_VERSIONS: {
    '5.0': 2000,
    '4.0': 1400,
    '3.0': 700,
  },
  // Palabras clave por categoría - 3000 pts (500 pts por categoría)
  TECHNOLOGY_KEYWORDS: {
    ia: ['ai', 'npu', 'deep learning', 'ryzen ai', 'xdna', 'neural', 'avx-512'],
    multithread: ['hyper-threading', 'smt', 'simultaneous multithreading', 'multihilo', 'multithread'],
    overclock: ['unlocked', 'desbloqueado', 'overclock', 'overclocking', 'pbo', 'precision boost overdrive', 'thermal velocity boost', 'expo', 'xmp'],
    architecture: ['3d v-cache', '3d cache', 'thread director', 'chiplet'],
    virtualization: ['virtualization', 'virtualizacion', 'vt-x', 'vt-d', 'amd-v', 'svm'],
    security: ['vpro', 'trustzone', 'amd pro', 'sgx', 'ftpm', 'tpm'],
  },
};
