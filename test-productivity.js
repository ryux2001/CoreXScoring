// Test script para verificar cálculos de productividad
const safeExtract = (value, defaultValue = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return defaultValue;
};

// Intel i5-12400F
const i5 = {
  benchmarks: {
    cinebench_multi: 12344,
    passmark_score: 19596
  },
  specs: {
    threads: 12,
    efficency_cores: 0,
    ram_max_support: 128
  },
  technologies: [
    { name: "Intel Virtualization Technology" },
    { name: "Intel Deep Learning Boost" }
  ]
};

// AMD Ryzen 5 600X
const ryzen = {
  benchmarks: {
    cinebench_multi: 12000,
    passmark_score: 21911
  },
  specs: {
    threads: 12,
    efficency_cores: 0,
    ram_max_support: 128
  },
  technologies: [
    { name: "AMD-V" }
  ]
};

// Cálculo i5
console.log("=== INTEL i5-12400F ===");
const i5_cinebench = safeExtract(i5.benchmarks?.cinebench_multi, 0);
const i5_passmark = safeExtract(i5.benchmarks?.passmark_score, 0);
const i5_threads = parseInt(i5.specs?.threads || '0', 10);
const i5_ecores = parseInt(i5.specs?.efficency_cores || '0', 10);
const i5_ram = safeExtract(i5.specs?.ram_max_support, 0);

console.log("Cinebench:", i5_cinebench);
console.log("Passmark:", i5_passmark);
console.log("Threads:", i5_threads);
console.log("Ecores:", i5_ecores);
console.log("RAM:", i5_ram);

const i5_cinebenchPoints = (i5_cinebench / 50000) * 3000;
const i5_passmarkPoints = (i5_passmark / 80000) * 1500;
const i5_bruteForce = i5_cinebenchPoints + i5_passmarkPoints;

const i5_threadsPoints = (Math.min(i5_threads, 32) / 32) * 2000;
const i5_ecoresPoints = (Math.min(i5_ecores, 16) / 16) * 1000;
const i5_physical = i5_threadsPoints + i5_ecoresPoints;

let i5_hasVirtualization = false;
for (const tech of i5.technologies) {
  const name = (tech?.name || '').toLowerCase();
  if (name.includes('virtualization') || name.includes('vt-x') || name.includes('amd-v')) {
    i5_hasVirtualization = true;
    break;
  }
}

let i5_hasAI = false;
for (const tech of i5.technologies) {
  const name = (tech?.name || '').toLowerCase();
  if (name.includes('ai') || name.includes('npu') || name.includes('deep learning')) {
    i5_hasAI = true;
    break;
  }
}

const i5_ramPoints = (Math.min(i5_ram, 192) / 192) * 1000;
const i5_virtualizationPoints = i5_hasVirtualization ? 750 : 0;
const i5_aiPoints = i5_hasAI ? 750 : 0;
const i5_professional = i5_ramPoints + i5_virtualizationPoints + i5_aiPoints;

const i5_total = i5_bruteForce + i5_physical + i5_professional;
const i5_score = i5_total / 1000;

console.log("\nCinebench pts:", i5_cinebenchPoints.toFixed(2));
console.log("Passmark pts:", i5_passmarkPoints.toFixed(2));
console.log("Brute force:", i5_bruteForce.toFixed(2));
console.log("Threads pts:", i5_threadsPoints.toFixed(2));
console.log("Ecores pts:", i5_ecoresPoints.toFixed(2));
console.log("Physical:", i5_physical.toFixed(2));
console.log("RAM pts:", i5_ramPoints.toFixed(2));
console.log("Virtualization:", i5_virtualizationPoints);
console.log("AI:", i5_aiPoints);
console.log("Professional:", i5_professional.toFixed(2));
console.log("\nTOTAL PUNTOS:", i5_total.toFixed(2));
console.log("NOTA FINAL:", i5_score.toFixed(2));

// Cálculo Ryzen
console.log("\n\n=== AMD RYZEN 5 5600X ===");
const ryzen_cinebench = safeExtract(ryzen.benchmarks?.cinebench_multi, 0);
const ryzen_passmark = safeExtract(ryzen.benchmarks?.passmark_score, 0);
const ryzen_threads = parseInt(ryzen.specs?.threads || '0', 10);
const ryzen_ecores = parseInt(ryzen.specs?.efficency_cores || '0', 10);
const ryzen_ram = safeExtract(ryzen.specs?.ram_max_support, 0);

console.log("Cinebench:", ryzen_cinebench);
console.log("Passmark:", ryzen_passmark);
console.log("Threads:", ryzen_threads);
console.log("Ecores:", ryzen_ecores);
console.log("RAM:", ryzen_ram);

const ryzen_cinebenchPoints = (ryzen_cinebench / 50000) * 3000;
const ryzen_passmarkPoints = (ryzen_passmark / 80000) * 1500;
const ryzen_bruteForce = ryzen_cinebenchPoints + ryzen_passmarkPoints;

const ryzen_threadsPoints = (Math.min(ryzen_threads, 32) / 32) * 2000;
const ryzen_ecoresPoints = (Math.min(ryzen_ecores, 16) / 16) * 1000;
const ryzen_physical = ryzen_threadsPoints + ryzen_ecoresPoints;

let ryzen_hasVirtualization = false;
for (const tech of ryzen.technologies) {
  const name = (tech?.name || '').toLowerCase();
  if (name.includes('virtualization') || name.includes('vt-x') || name.includes('amd-v')) {
    ryzen_hasVirtualization = true;
    break;
  }
}

let ryzen_hasAI = false;
for (const tech of ryzen.technologies) {
  const name = (tech?.name || '').toLowerCase();
  if (name.includes('ai') || name.includes('npu') || name.includes('deep learning')) {
    ryzen_hasAI = true;
    break;
  }
}

const ryzen_ramPoints = (Math.min(ryzen_ram, 192) / 192) * 1000;
const ryzen_virtualizationPoints = ryzen_hasVirtualization ? 750 : 0;
const ryzen_aiPoints = ryzen_hasAI ? 750 : 0;
const ryzen_professional = ryzen_ramPoints + ryzen_virtualizationPoints + ryzen_aiPoints;

const ryzen_total = ryzen_bruteForce + ryzen_physical + ryzen_professional;
const ryzen_score = ryzen_total / 1000;

console.log("\nCinebench pts:", ryzen_cinebenchPoints.toFixed(2));
console.log("Passmark pts:", ryzen_passmarkPoints.toFixed(2));
console.log("Brute force:", ryzen_bruteForce.toFixed(2));
console.log("Threads pts:", ryzen_threadsPoints.toFixed(2));
console.log("Ecores pts:", ryzen_ecoresPoints.toFixed(2));
console.log("Physical:", ryzen_physical.toFixed(2));
console.log("RAM pts:", ryzen_ramPoints.toFixed(2));
console.log("Virtualization:", ryzen_virtualizationPoints);
console.log("AI:", ryzen_aiPoints);
console.log("Professional:", ryzen_professional.toFixed(2));
console.log("\nTOTAL PUNTOS:", ryzen_total.toFixed(2));
console.log("NOTA FINAL:", ryzen_score.toFixed(2));
