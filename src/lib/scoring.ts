/**
 * SISTEMA CENTRAL DE SCORING
 * Este archivo gestiona el cálculo de notas para todos los componentes.
 */

// Interfaces para tipado
export interface ComponentNotes {
  [key: string]: number;
}

// 1. CONFIGURACIÓN DE PUNTOS MÁXIMOS PARA POTENCIA CPU
const CPU_POTENCY_MAX_POINTS = 10000;

// Benchmarks (70% de los 10000 = 7000 pts)
const CPU_CINEBENCH_WEIGHT = 3500;  // 50% de 7000, techo 80000
const CPU_GEEKBENCH_WEIGHT = 2100;  // 30% de 7000, techo 3600
const CPU_PASSMARK_WEIGHT = 1400;   // 20% de 7000, techo 80000

// Specs (30% de los 10000 = 3000 pts)
const CPU_TURBO_WEIGHT = 1200;  // 40% de 3000, techo 6.2 GHz
const CPU_THREADS_WEIGHT = 900; // 30% de 3000, techo 32 hilos
const CPU_CACHE_WEIGHT = 900;   // 30% de 3000, techo 150 MB

// 2. NOTAS PARA CPU - POTENCIA
export const calculateCpuPotencyScore = (product: any): number => {
  const benchmarks = product?.benchmarks || {};
  const specs = product?.specs || {};
  
  // Benchmarks
  const cinebench = parseFloat(benchmarks?.cinebench_multi || '0');
  const geekbench = parseFloat(benchmarks?.geekbench_single || '0');
  const passmark = parseFloat(benchmarks?.passmark_score || '0');
  
  const cinebenchPoints = Math.min(cinebench, 50000) * (CPU_CINEBENCH_WEIGHT / 50000);
  const geekbenchPoints = Math.min(geekbench, 3600) * (CPU_GEEKBENCH_WEIGHT / 3600);
  const passmarkPoints = Math.min(passmark, 80000) * (CPU_PASSMARK_WEIGHT / 80000);
  
  const benchmarkTotal = cinebenchPoints + geekbenchPoints + passmarkPoints;
  
  // Specs
  const turbo = parseFloat(specs?.turbo_frequency || '0');
  const threads = parseInt(specs?.threads || '0');
  const cacheL3MB = parseFloat(specs?.cache?.l3 || '0') / 1024; // de KB a MB
  
  const turboPoints = Math.min(turbo, 6.2) * (CPU_TURBO_WEIGHT / 6.2);
  const threadsPoints = Math.min(threads, 32) * (CPU_THREADS_WEIGHT / 32);
  const cachePoints = Math.min(cacheL3MB, 150) * (CPU_CACHE_WEIGHT / 150);
  
  const specsTotal = turboPoints + threadsPoints + cachePoints;
  
  // Total points
  const totalPoints = benchmarkTotal + specsTotal;
  
  // Nota final (0-10)
  return Math.min(10, (totalPoints / CPU_POTENCY_MAX_POINTS) * 10);
};

// 3. CONFIGURACIÓN DE PUNTOS MÁXIMOS PARA LAS OTRAS NOTAS CPU
const CPU_NOTES_MAX_POINTS = 10000;

const CPU_TECH_WEIGHT = 10000 * 0.15; // 1500 pts
const CPU_PROD_WEIGHT = 10000 * 0.15; // 1500 pts
const CPU_GAME_WEIGHT = 10000 * 0.20; // 2000 pts
const CPU_EFF_WEIGHT = 10000 * 0.15; // 1500 pts
const CPU_VALUE_WEIGHT = 10000 * 0.35; // 3500 pts

// 1. NOTAS PARA CPU - POTENCIA
export const getCpuNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  const potencyScore = calculateCpuPotencyScore(product);
  
  return {
    "Potencia": potencyScore,
    "Tecnologías": 7.5,
    "Productividad": 7.5,
    "Juegos": 7.5,
    "Eficiencia": 7.5,
    "Calidad precio": 7.5,
  };
};

// 2. NOTAS PARA GPU
export const getGpuNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Potencia": 7.5,
    "Tecnologías": 7.5,
    "Productividad": 7.5,
    "Juegos": 7.5,
    "Eficiencia": 7.5,
    "Calidad precio": 7.5,
  };
};

// 3. NOTAS PARA RAM
export const getRamNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Velocidad": 7.5,
    "Tecnologías": 7.5,
    "Latencia": 7.5,
    "Compatibilidad": 7.5,
    "Eficiencia": 7.5,
    "Calidad precio": 7.5,
  };
};

// 4. NOTAS PARA STORAGE (SSD/HDD)
export const getStorageNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Velocidad": 7.5,
    "Tecnologías": 7.5,
    "Temperaturas": 7.5,
    "Durabilidad": 7.5,
    "Eficiencia": 7.5,
    "Calidad Precio": 7.5,
  };
};

// 5. NOTAS PARA MOTHERBOARDS
export const getMotherboardNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Conectividad": 7.5,
    "Tecnologías": 7.5,
    "Construcción": 7.5,
    "Compatibilidad": 7.5,
    "Estabilidad": 7.5,
    "Calidad precio": 7.5,
  };
};

// 6. NOTAS PARA PSU (Fuentes de poder)
export const getPsuNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  return {
    "Estabilidad": 7.5,
    "Conectividad": 7.5,
    "Protecciones": 7.5,
    "Construcción": 7.5,
    "Eficiencia": 7.5,
    "Calidad Precio": 7.5,
  };
};

/**
 * FUNCIÓN SELECTORA (Orquestador)
 * Esta es la función que llamaremos desde los componentes.
 */
export const getComponentNotes = (product: any, evaluatedPrice: number): ComponentNotes => {
  const type = product?.type?.toUpperCase();

  switch (type) {
    case 'CPU': return getCpuNotes(product, evaluatedPrice);
    case 'GPU': return getGpuNotes(product, evaluatedPrice);
    case 'RAM': return getRamNotes(product, evaluatedPrice);
    case 'STORAGE': return getStorageNotes(product, evaluatedPrice);
    case 'MOTHERBOARD': return getMotherboardNotes(product, evaluatedPrice);
    case 'PSU': return getPsuNotes(product, evaluatedPrice);
    default:
      return {
        "Rendimiento": 7.5,
        "Características": 7.5,
        "Construcción": 7.5,
        "Eficiencia": 7.5,
        "Calidad precio": 7.5,
      };
  }
};