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
  
  // Productivity Score Configuration (10000 pts total)
  PRODUCTIVITY: {
    // 1. Fuerza bruta multitarea (4500 pts)
    BRUTE_FORCE: {
      POINTS: 4500,
      WEIGHTS: {
        cinebench: 3000,  // pts para Cinebench
        passmark: 1500,   // pts para Passmark
      },
      MAX_VALUES: {
        cinebench: 50000,  // techo Cinebench Multi
        passmark: 80000,   // techo Passmark
      },
    },
    
    // 2. Capacidad física (3000 pts)
    PHYSICAL_CAPACITY: {
      POINTS: 3000,
      WEIGHTS: {
        threads: 2000,    // pts para hilos
        ecores: 1000,     // pts para ecores
      },
      MAX_VALUES: {
        threads: 32,      // max hilos
        ecores: 16,       // max ecores
      },
    },
    
    // 3. Ecosistema profesional (2500 pts)
    PROFESSIONAL_ECOSYSTEM: {
      POINTS: 2500,
      WEIGHTS: {
        ram: 1000,        // pts para RAM max
      },
      MAX_VALUES: {
        ram: 192,         // max RAM en GB
      },
    },
    
    // Puntos fijos para tecnologías bonus
    VIRTUALIZATION_POINTS: 750,
    AI_POINTS: 750,
    
    // Keywords para tecnologías
    TECHNOLOGY_KEYWORDS: {
      virtualization: ['virtualization', 'virtualizacion', 'vt-x', 'vt-d', 'amd-v', 'svm'],
      ai: ['ai', 'npu', 'deep learning', 'ryzen ai', 'xdna', 'neural', 'avx-512'],
    },
    
    // Validación
    TOTAL_POINTS: 10000,
  },
  
  // Gaming Score Configuration (10000 pts total)
  GAMING: {
    // 1. Benchmarks y núcleos (4000 pts)
    BENCHMARKS_CORES: {
      POINTS: 4000,
      WEIGHTS: {
        geekbench: 3000,
        cores: 1000,
      },
      MAX_VALUES: {
        geekbench: 3600,
      },
      // Núcleos escalonados
      CORES_STEPS: {
        high: { threshold: 8, points: 1000 },
        medium: { threshold: 6, points: 850 },
        low: { threshold: 4, points: 400 },
        none: { points: 0 },
      },
    },
    
    // 2. Cache y frecuencias (4000 pts)
    CACHE_FREQUENCY: {
      POINTS: 4000,
      WEIGHTS: {
        cache: 2500,
        turbo: 1500,
      },
      MAX_VALUES: {
        cache: 150,    // MB
        turbo: 6.2,    // GHz
      },
    },
    
    // 3. Ancho de banda y plataforma (2000 pts)
    BANDWIDTH_PLATFORM: {
      POINTS: 2000,
      RAM_SCORES: {
        ddr5: 1000,
        ddr4: 750,
        ddr3: 400,
      },
      PCIE_SCORES: {
        '5': 1000,
        '4': 900,
        '3': 500,
      },
    },
    
    // Validación
    TOTAL_POINTS: 10000,
  },
};
