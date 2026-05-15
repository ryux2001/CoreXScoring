// Test script para diagnosticar datos JSONB desde Supabase
// Este script simula cómo Supabase devuelve los datos JSONB

// Función safeExtract corregida
const safeExtract = (value, defaultValue = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : defaultValue;
  }
  return defaultValue;
};

// Simular datos que viene Supabase (JSONB como strings)
const productFromSupabase = {
  id: 'cpu-12400f',
  benchmarks: '{"cinebench_multi": 12344, "geekbench_single": 2350, "passmark_score": 19596}',
  specs: '{"cores": 6, "efficency_cores": 0, "threads": 12, "base_frequency": 2.5, "turbo_frequency": 4.4, "tdp": 65, "power_base": 65, "power_turbo_max": 117, "architecture": "Alder Lake S", "cache": {"l1": 480, "l2": 7680, "l3": 18432}}',
  technologies: '[{"name": "Intel Hyper-Threading", "description": "Mejora multitarea."}, {"name": "Intel Turbo Boost 2.0", "description": "Aumenta frecuencia."}, {"name": "PCIe 5.0 Support", "description": "Doble ancho de banda."}, {"name": "Intel Deep Learning Boost", "description": "Acelera IA."}, {"name": "Intel Virtualization Technology", "description": "Múltiples SO."}]',
  ram_max_support: 128
};

console.log('=== DATOS DESDE SUPABASE (JSONB STRINGS) ===');
console.log('benchmarks:', productFromSupabase.benchmarks);
console.log('specs:', productFromSupabase.specs);
console.log('technologies:', productFromSupabase.technologies);
console.log('ram_max_support:', productFromSupabase.ram_max_support);
console.log('');

// Simular cómo se accede a los datos en el código actual
console.log('=== ACCESO DIRECTO (SIN PARSEAR) ===');
const benchmarksDirect = productFromSupabase.benchmarks || {};
const specsDirect = productFromSupabase.specs || {};
const technologiesDirect = productFromSupabase.technologies || [];

console.log('benchmarks?.cinebench_multi:', benchmarksDirect?.cinebench_multi, '(type:', typeof benchmarksDirect?.cinebench_multi, ')');
console.log('benchmarks?.passmark_score:', benchmarksDirect?.passmark_score, '(type:', typeof benchmarksDirect?.passmark_score, ')');
console.log('specs?.threads:', specsDirect?.threads, '(type:', typeof specsDirect?.threads, ')');
console.log('specs?.efficency_cores:', specsDirect?.efficency_cores, '(type:', typeof specsDirect?.efficency_cores, ')');
console.log('specs?.ram_max_support:', specsDirect?.ram_max_support, '(type:', typeof specsDirect?.ram_max_support, ')');
console.log('technologies:', technologiesDirect, '(type:', Array.isArray(technologiesDirect) ? 'array' : typeof technologiesDirect, ')');
console.log('');

// Verificar si technologies es array u objeto
console.log('technologies es array:', Array.isArray(technologiesDirect));
console.log('technologies es string:', typeof technologiesDirect === 'string');
console.log('');

// Intentar parsear
console.log('=== DESPUÉS DE PARSEAR JSON ===');
const benchmarksParsed = typeof productFromSupabase.benchmarks === 'string' 
  ? JSON.parse(productFromSupabase.benchmarks) 
  : productFromSupabase.benchmarks;

const specsParsed = typeof productFromSupabase.specs === 'string'
  ? JSON.parse(productFromSupabase.specs)
  : productFromSupabase.specs;

const technologiesParsed = typeof productFromSupabase.technologies === 'string'
  ? JSON.parse(productFromSupabase.technologies)
  : productFromSupabase.technologies;

console.log('benchmarks?.cinebench_multi:', safeExtract(benchmarksParsed?.cinebench_multi, 0), '(type:', typeof benchmarksParsed?.cinebench_multi, ')');
console.log('benchmarks?.passmark_score:', safeExtract(benchmarksParsed?.passmark_score, 0), '(type:', typeof benchmarksParsed?.passmark_score, ')');
console.log('specs?.threads:', safeExtract(specsParsed?.threads, 0), '(type:', typeof specsParsed?.threads, ')');
console.log('specs?.efficency_cores:', safeExtract(specsParsed?.efficency_cores, 0), '(type:', typeof specsParsed?.efficency_cores, ')');
console.log('specs?.ram_max_support:', safeExtract(specsParsed?.ram_max_support, 0), '(type:', typeof specsParsed?.ram_max_support, ')');
console.log('technologies:', technologiesParsed, '(type:', Array.isArray(technologiesParsed) ? 'array' : typeof technologiesParsed, ')');
console.log('');

// Verificar tecnologías
console.log('=== VERIFICACIÓN DE TECNOLOGÍAS ===');
let hasVirtualization = false;
let hasAI = false;

for (const tech of technologiesParsed) {
  const name = (tech?.name || '').toLowerCase();
  console.log('Tech name:', name);
  if (name.includes('virtualization') || name.includes('vt-x') || name.includes('amd-v')) {
    hasVirtualization = true;
    console.log('  → Found virtualization!');
  }
  if (name.includes('ai') || name.includes('npu') || name.includes('deep learning')) {
    hasAI = true;
    console.log('  → Found AI!');
  }
}

console.log('hasVirtualization:', hasVirtualization);
console.log('hasAI:', hasAI);
console.log('');

// Calcular nota
console.log('=== CÁLCULO DE NOTA (CON PARSE) ===');
const cinebench = safeExtract(benchmarksParsed?.cinebench_multi, 0);
const passmark = safeExtract(benchmarksParsed?.passmark_score, 0);
const threads = parseInt(specsParsed?.threads || '0', 10);
const ecores = parseInt(specsParsed?.efficency_cores || '0', 10);
const ramMax = safeExtract(specsParsed?.ram_max_support, 0);

const cinebenchPoints = (cinebench / 50000) * 3000;
const passmarkPoints = (passmark / 80000) * 1500;
const bruteForceTotal = cinebenchPoints + passmarkPoints;

const threadsPoints = (Math.min(threads, 32) / 32) * 2000;
const ecoresPoints = (Math.min(ecores, 16) / 16) * 1000;
const physicalCapacityTotal = threadsPoints + ecoresPoints;

const ramPoints = (Math.min(ramMax, 192) / 192) * 1000;
const virtualizationPoints = hasVirtualization ? 750 : 0;
const aiPoints = hasAI ? 750 : 0;
const professionalEcosystemTotal = ramPoints + virtualizationPoints + aiPoints;

const totalPoints = bruteForceTotal + physicalCapacityTotal + professionalEcosystemTotal;
const normalizedScore = totalPoints / 1000;

console.log('Cinebench pts:', cinebenchPoints.toFixed(2));
console.log('Passmark pts:', passmarkPoints.toFixed(2));
console.log('Brute force:', bruteForceTotal.toFixed(2));
console.log('Threads pts:', threadsPoints.toFixed(2));
console.log('Ecores pts:', ecoresPoints.toFixed(2));
console.log('Physical:', physicalCapacityTotal.toFixed(2));
console.log('RAM pts:', ramPoints.toFixed(2));
console.log('Virtualization:', virtualizationPoints);
console.log('AI:', aiPoints);
console.log('Professional:', professionalEcosystemTotal.toFixed(2));
console.log('');
console.log('TOTAL PUNTOS:', totalPoints.toFixed(2));
console.log('NOTA FINAL:', normalizedScore.toFixed(2));
console.log('');
console.log('=== RESULTADO ESPERADO: 4.02 ===');
