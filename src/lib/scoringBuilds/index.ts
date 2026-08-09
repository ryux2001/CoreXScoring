import { getComponentNotes } from '@/lib/scoring';

export interface BuildNotes {
  potencia: number;
  productividad: number;
  gaming: number;
  eficiencia: number;
  cuelloBotella: number;
  compatibilidad: number;
  actualizaciones: number;
  calidadPrecio: number;
}

type Build = Record<string, any>;

const buildParts = ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu'] as const;

const parseJson = (value: unknown): any => {
  if (typeof value !== 'string') return value || {};

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const clamp = (value: number, min = 0, max = 10): number =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

const safeNote = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return clamp(value);
};

const round1 = (value: number): number => Math.round(clamp(value) * 10) / 10;

const numberValue = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const textValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalize = (value: unknown): string =>
  textValue(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const asArray = (value: unknown): any[] => {
  const parsed = parseJson(value);
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'string' && parsed.trim()) return [parsed];
  return [];
};

const getSpecs = (product: Build | undefined): Build =>
  parseJson(product?.specs) || {};

const getCompatibility = (product: Build | undefined): Build =>
  parseJson(product?.compatibility) || {};

const getNote = (notes: Build | undefined, keys: string[]): number => {
  for (const key of keys) {
    const value = notes?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return safeNote(value);
  }
  return 0;
};

export const getBuildPartPrice = (
  build: Build,
  part: string,
  currency: string,
): number => {
  const item = build?.[part];
  const normalizedCurrency = currency.toLowerCase() === 'eur' ? 'eur' : 'usd';
  const customKeys = [
    `custom_price_${part}_${normalizedCurrency}`,
    `price_${part}_${normalizedCurrency}`,
  ];

  for (const key of customKeys) {
    const customPrice = numberValue(build?.[key], -1);
    if (customPrice >= 0) return customPrice;
  }

  const basePrice = numberValue(item?.[`price_base_${normalizedCurrency}`], -1);
  if (basePrice >= 0) return basePrice;

  return numberValue(item?.price_base_usd, 0);
};

const getComponentScores = (build: Build, currency: string) => {
  const scores: Record<string, Build> = {};

  for (const part of buildParts) {
    const product = build?.[part];
    scores[part] = product
      ? getComponentNotes(product, getBuildPartPrice(build, part, currency))
      : {};
  }

  return scores;
};

const getStorageProductivity = (scores: Build | undefined): number =>
  clamp(
    getNote(scores, ['Velocidad']) * 0.7 +
      getNote(scores, ['Durabilidad']) * 0.2 +
      getNote(scores, ['Temperaturas']) * 0.1,
  );

const getStorageGaming = (scores: Build | undefined): number =>
  clamp(
    getNote(scores, ['Velocidad']) * 0.85 +
      getNote(scores, ['Temperaturas']) * 0.15,
  );

const getBuildPower = (scores: Record<string, Build>): number =>
  clamp(
    getNote(scores.cpu, ['Potencia']) * 0.375 +
      getNote(scores.gpu, ['Potencia']) * 0.425 +
      getNote(scores.ram, ['Velocidad']) * 0.075 +
      getNote(scores.ram, ['Latencia']) * 0.05 +
      getNote(scores.storage, ['Velocidad']) * 0.075,
  );

const getBuildProductivity = (scores: Record<string, Build>): number =>
  clamp(
    getNote(scores.cpu, ['Productividad']) * 0.35 +
      getNote(scores.gpu, ['Productividad']) * 0.3 +
      getNote(scores.ram, ['Productividad']) * 0.2 +
      getStorageProductivity(scores.storage) * 0.15,
  );

const getBuildGaming = (scores: Record<string, Build>): number =>
  clamp(
    getNote(scores.gpu, ['Juegos']) * 0.525 +
      getNote(scores.cpu, ['Juegos']) * 0.275 +
      getNote(scores.ram, ['Juegos']) * 0.15 +
      getStorageGaming(scores.storage) * 0.05,
  );

const getBuildEfficiency = (scores: Record<string, Build>): number =>
  clamp(
    getNote(scores.gpu, ['Eficiencia']) * 0.4 +
      getNote(scores.cpu, ['Eficiencia']) * 0.3 +
      getNote(scores.psu, ['Eficiencia']) * 0.2 +
      getNote(scores.storage, ['Eficiencia']) * 0.1,
  );

const getBuildBottleneck = (scores: Record<string, Build>): number => {
  const cpuGaming = getNote(scores.cpu, ['Juegos']);
  const gpuGaming = getNote(scores.gpu, ['Juegos']);
  const ramGaming = getNote(scores.ram, ['Juegos']);
  const storageGaming = getStorageGaming(scores.storage);
  const mainLevel = Math.max(cpuGaming, gpuGaming);
  const friction =
    Math.abs(cpuGaming - gpuGaming) * 0.7 +
    Math.max(0, mainLevel - ramGaming) * 0.2 +
    Math.max(0, mainLevel - storageGaming) * 0.1;

  return clamp(10 - friction * 1.15);
};

const parseGeneration = (value: unknown): number | null => {
  const normalized = normalize(value);
  const match = normalized.match(/(?:pcie|gen|generation)[^0-9]*([345])/);
  if (match) return Number(match[1]);

  const direct = textValue(value).match(/\b([345])(?:\.0)?\b/);
  return direct ? Number(direct[1]) : null;
};

const getHighestGeneration = (values: unknown[]): number | null => {
  const generations = values
    .map(parseGeneration)
    .filter((value): value is number => value !== null);
  return generations.length ? Math.max(...generations) : null;
};

const getSocket = (product: Build | undefined): string => {
  const socket = getCompatibility(product).socket ?? product?.socket;
  return normalize(Array.isArray(socket) ? socket[0] : socket);
};

const getRamType = (product: Build | undefined): string => {
  const specs = getSpecs(product);
  const compatibility = getCompatibility(product);
  return normalize(
    specs.type ??
      specs.technology ??
      compatibility.ram_type ??
      compatibility.technology,
  );
};

const getRamCapacity = (product: Build | undefined): number => {
  const specs = getSpecs(product);
  return numberValue(specs.capacity_gb ?? specs.capacity, 0);
};

const getRamFrequency = (product: Build | undefined): number => {
  const specs = getSpecs(product);
  const compatibility = getCompatibility(product);
  return numberValue(
    specs.frequency_mhz ?? specs.speed ?? compatibility.ram_frecuency,
    0,
  );
};

const getMaxRamSupport = (product: Build | undefined): number =>
  numberValue(getCompatibility(product).ram_max_support, 0);

const getMotherboardRamTypes = (motherboard: Build | undefined): string[] => {
  const compatibility = getCompatibility(motherboard);
  const explicitType = compatibility.ram_type;
  if (explicitType) return asArray(explicitType).map(normalize);

  return asArray(compatibility.ram_support)
    .map((value) => normalize(textValue(value).split('-')[0]));
};

const getMotherboardMaxRamFrequency = (motherboard: Build | undefined): number => {
  const supported = asArray(getCompatibility(motherboard).ram_support);
  const frequencies = supported
    .map((value) => textValue(value).match(/(\d{4,})/)?.[1])
    .filter(Boolean)
    .map((value) => Number(value));

  return frequencies.length ? Math.max(...frequencies) : 0;
};

const getPsuWatts = (psu: Build | undefined): number =>
  numberValue(getSpecs(psu).wattage ?? getSpecs(psu).watts, 0);

const getEstimatedConsumption = (build: Build): number => {
  const cpuSpecs = getSpecs(build.cpu);
  const gpuSpecs = getSpecs(build.gpu);
  const storageSpecs = getSpecs(build.storage);

  return (
    numberValue(cpuSpecs.power_turbo_max ?? cpuSpecs.tdp, 0) +
    numberValue(gpuSpecs.tdp ?? gpuSpecs.power, 0) +
    numberValue(storageSpecs.power_w, 8) +
    10 +
    50
  );
};

const getCpuBoardCompatibility = (cpu: Build, motherboard: Build) => {
  const cpuSocket = getSocket(cpu);
  const motherboardSocket = getSocket(motherboard);
  const socketMatch = !cpuSocket || !motherboardSocket
    ? 5
    : cpuSocket === motherboardSocket
      ? 10
      : 0;

  const cpuChipsets = asArray(getCompatibility(cpu).chipsets).map(normalize);
  const motherboardChipset = normalize(
    getCompatibility(motherboard).chipset ?? getSpecs(motherboard).chipset,
  );
  const chipsetMatch = !motherboardChipset
    ? 6
    : cpuChipsets.length === 0
      ? 6
      : cpuChipsets.some((chipset) => chipset.includes(motherboardChipset))
        ? 10
        : 0;

  return {
    note: clamp(socketMatch * 0.7 + chipsetMatch * 0.3),
    socketMismatch: socketMatch === 0,
  };
};

const getRamPlatformCompatibility = (
  ram: Build,
  cpu: Build,
  motherboard: Build,
) => {
  const ramType = getRamType(ram);
  const cpuRamType = getRamType(cpu);
  const motherboardRamTypes = getMotherboardRamTypes(motherboard);
  const ramTypeMatch = !ramType || !cpuRamType || motherboardRamTypes.length === 0
    ? 5
    : ramType === cpuRamType && motherboardRamTypes.some((type) => type.includes(ramType))
      ? 10
      : 0;

  const capacityLimitValues = [
    getMaxRamSupport(cpu),
    numberValue(getCompatibility(motherboard).ram_max_capacity, 0),
  ].filter((value) => value > 0);
  const capacityLimit = capacityLimitValues.length
    ? Math.min(...capacityLimitValues)
    : 0;
  const ramCapacity = getRamCapacity(ram);
  const capacityScore = !capacityLimit || !ramCapacity
    ? 7
    : ramCapacity <= capacityLimit
      ? 10
      : 0;

  const ramFrequency = getRamFrequency(ram);
  const motherboardFrequency = getMotherboardMaxRamFrequency(motherboard);
  let frequencyScore = 7;
  if (ramFrequency && motherboardFrequency) {
    frequencyScore = ramFrequency <= motherboardFrequency
      ? 10
      : Math.max(5, 10 - ((ramFrequency - motherboardFrequency) / motherboardFrequency) * 10);
  }

  return {
    note: clamp(ramTypeMatch * 0.55 + capacityScore * 0.2 + frequencyScore * 0.25),
    ramTypeMismatch: ramTypeMatch === 0,
  };
};

const getPsuCompatibility = (build: Build, scores: Record<string, Build>) => {
  const estimatedConsumption = getEstimatedConsumption(build);
  const recommended = estimatedConsumption * 1.3;
  const watts = getPsuWatts(build.psu);
  let wattsScore = 0;

  if (watts >= recommended) {
    wattsScore = 10;
  } else if (watts >= estimatedConsumption && recommended > estimatedConsumption) {
    wattsScore = 6 + ((watts - estimatedConsumption) / (recommended - estimatedConsumption)) * 4;
  } else if (estimatedConsumption > 0) {
    wattsScore = Math.max(0, 6 * watts / estimatedConsumption);
  }

  const connectorsScore = getNote(scores.psu, ['Conectividad']) || 5;
  return {
    note: clamp(wattsScore * 0.75 + connectorsScore * 0.25),
    belowEstimatedConsumption: watts < estimatedConsumption,
    criticallyBelowEstimatedConsumption: watts < estimatedConsumption * 0.85,
    missingRequiredConnector: false,
  };
};

const getGpuBoardCompatibility = (gpu: Build, motherboard: Build) => {
  const pcieSlots = asArray(getSpecs(motherboard).pcie_slots);
  const hasGpuSlot = pcieSlots.some((slot) => /x16/i.test(textValue(slot)) && !/\(x\d+\)/i.test(textValue(slot)));
  const gpuSlotScore = pcieSlots.length === 0 ? 6 : hasGpuSlot ? 10 : 0;
  const gpuGeneration = getHighestGeneration([
    getCompatibility(gpu).pcie_generation,
    getSpecs(gpu).pcie,
  ]);
  const motherboardGeneration = getHighestGeneration([
    getSpecs(motherboard).pcie_generation,
    ...pcieSlots,
  ]);
  let generationScore = 7;
  if (gpuGeneration !== null && motherboardGeneration !== null) {
    const difference = gpuGeneration - motherboardGeneration;
    generationScore = difference <= 0 ? 10 : difference === 1 ? 8 : difference === 2 ? 6 : 4;
  }

  return {
    note: clamp(gpuSlotScore * 0.6 + generationScore * 0.4),
    missingGpuSlot: gpuSlotScore === 0,
  };
};

const getStorageCompatibility = (storage: Build, motherboard: Build) => {
  const storageCompatibility = getCompatibility(storage);
  const storageSpecs = getSpecs(storage);
  const interfaceName = normalize(
    storageCompatibility.interface ??
      storageSpecs.interface ??
      storageCompatibility.form_factor ??
      storageSpecs.form_factor,
  );
  const isM2 = interfaceName.includes('m.2') || interfaceName.includes('nvme') || interfaceName.includes('pcie');
  const isSata = interfaceName.includes('sata');
  const m2Slots = asArray(getSpecs(motherboard).m2_slots);
  const sataPorts = numberValue(getSpecs(motherboard).sata_ports, 0);
  const compatibleSlot = isM2
    ? m2Slots.length > 0
    : isSata
      ? sataPorts > 0
      : m2Slots.length > 0 || sataPorts > 0;
  const slotScore = m2Slots.length === 0 && sataPorts === 0 ? 6 : compatibleSlot ? 10 : 0;

  const storageGeneration = getHighestGeneration([
    storageCompatibility.pcie_generation,
    storageSpecs.pcie_generation,
  ]);
  const motherboardGeneration = getHighestGeneration(m2Slots);
  let generationScore = 7;
  if (storageGeneration !== null && motherboardGeneration !== null) {
    const difference = storageGeneration - motherboardGeneration;
    generationScore = difference <= 0 ? 10 : difference === 1 ? 8 : difference === 2 ? 6 : 4;
  }

  const totalSlots = m2Slots.length + sataPorts;
  const marginScore = totalSlots === 0 ? 5 : compatibleSlot && totalSlots > 1 ? 10 : compatibleSlot ? 7 : 0;

  return {
    note: clamp(slotScore * 0.6 + generationScore * 0.3 + marginScore * 0.1),
    missingStorageSlot: slotScore === 0,
  };
};

const getBuildCompatibility = (build: Build, scores: Record<string, Build>): number => {
  const cpuBoard = getCpuBoardCompatibility(build.cpu, build.motherboard);
  const ramPlatform = getRamPlatformCompatibility(build.ram, build.cpu, build.motherboard);
  const psu = getPsuCompatibility(build, scores);
  const gpuBoard = getGpuBoardCompatibility(build.gpu, build.motherboard);
  const storageBoard = getStorageCompatibility(build.storage, build.motherboard);
  const platformBase = getNote(scores.motherboard, ['Compatibilidad']) || 5;

  let note = clamp(
    cpuBoard.note * 0.3 +
      ramPlatform.note * 0.2 +
      psu.note * 0.25 +
      gpuBoard.note * 0.1 +
      storageBoard.note * 0.1 +
      platformBase * 0.05,
  );

  if (cpuBoard.socketMismatch) note = Math.min(note, 3);
  if (ramPlatform.ramTypeMismatch) note = Math.min(note, 4);
  if (psu.belowEstimatedConsumption) note = Math.min(note, 5);
  if (psu.criticallyBelowEstimatedConsumption) note = Math.min(note, 3);
  if (psu.missingRequiredConnector) note = Math.min(note, 4);
  if (gpuBoard.missingGpuSlot) note = Math.min(note, 4);
  if (storageBoard.missingStorageSlot) note = Math.min(note, 6);

  return clamp(note);
};

const getSocketFutureScore = (socket: string): number => {
  if (socket.includes('am5')) return 10;
  if (socket.includes('1851')) return 8.5;
  if (socket.includes('1700')) return 5;
  if (socket.includes('am4')) return 4;
  if (!socket) return 5;
  return 2;
};

const getRamGenerationScore = (type: string): number => {
  if (type.includes('ddr5')) return 10;
  if (type.includes('ddr4')) return 6;
  if (type.includes('ddr3')) return 2;
  return 5;
};

const getPcieGenerationScore = (generation: number | null): number => {
  if (generation === 5) return 10;
  if (generation === 4) return 8;
  if (generation === 3) return 5;
  return 5;
};

const getPlatformFuture = (cpu: Build, motherboard: Build): number =>
  clamp(
    getSocketFutureScore(getSocket(motherboard) || getSocket(cpu)) * 0.55 +
      getRamGenerationScore(getRamType(motherboard) || getRamType(cpu)) * 0.25 +
      getPcieGenerationScore(getHighestGeneration([
        getSpecs(motherboard).pcie_generation,
        ...asArray(getSpecs(motherboard).pcie_slots),
      ])) * 0.2,
  );

const getPsuUpgradeMargin = (build: Build, scores: Record<string, Build>): number => {
  const estimatedConsumption = getEstimatedConsumption(build);
  const idealMargin = Math.max(250, estimatedConsumption * 0.5);
  const wattMargin = clamp(((getPsuWatts(build.psu) - estimatedConsumption) / idealMargin) * 10);
  const connectivity = getNote(scores.psu, ['Conectividad']) || 5;
  return clamp(wattMargin * 0.7 + connectivity * 0.3);
};

const getRamUpgradeMargin = (ram: Build, cpu: Build, motherboard: Build): number => {
  const maxValues = [
    getMaxRamSupport(cpu),
    numberValue(getCompatibility(motherboard).ram_max_capacity, 0),
  ].filter((value) => value > 0);
  const maxCapacity = maxValues.length ? Math.min(...maxValues) : 0;
  const currentCapacity = getRamCapacity(ram);
  const capacityMargin = maxCapacity && currentCapacity
    ? clamp(((maxCapacity - currentCapacity) / (maxCapacity * 0.75)) * 10)
    : 5;
  const ramSlots = numberValue(getSpecs(motherboard).ram_slots ?? getCompatibility(motherboard).ram_slots, 0);
  const slotsUsed = numberValue(getSpecs(ram).slots_used, 0);
  const slotMargin = ramSlots > 0 ? clamp(((ramSlots - slotsUsed) / ramSlots) * 10) : 5;

  return clamp(
    capacityMargin * 0.6 +
      getRamGenerationScore(getRamType(ram)) * 0.25 +
      slotMargin * 0.15,
  );
};

const getStorageUpgradeMargin = (storage: Build, motherboard: Build, scores: Record<string, Build>): number => {
  const specs = getSpecs(motherboard);
  const m2Slots = asArray(specs.m2_slots);
  const sataPorts = numberValue(specs.sata_ports, 0);
  const hasUsageData = specs.m2_used !== undefined || specs.sata_used !== undefined;
  const m2Used = numberValue(specs.m2_used, 0);
  const sataUsed = numberValue(specs.sata_used, 0);
  const totalSlots = m2Slots.length + sataPorts;
  const freeSlots = Math.max(0, m2Slots.length - m2Used) + Math.max(0, sataPorts - sataUsed);
  const slotsMargin = totalSlots > 0 && hasUsageData
    ? clamp((freeSlots / totalSlots) * 10)
    : getNote(scores.motherboard, ['Expansión interna', 'ExpansiÃ³n interna', 'Expansion interna']) || 5;
  const futureGeneration = getPcieGenerationScore(getHighestGeneration([
    getCompatibility(storage).pcie_generation,
    getSpecs(storage).pcie_generation,
  ]));

  return clamp(slotsMargin * 0.7 + futureGeneration * 0.3);
};

const getBuildUpgradeability = (build: Build, scores: Record<string, Build>, compatibility: number): number => {
  let note = clamp(
    getPlatformFuture(build.cpu, build.motherboard) * 0.3 +
      (getNote(scores.motherboard, ['Expansión interna', 'ExpansiÃ³n interna', 'Expansion interna']) || 5) * 0.25 +
      getPsuUpgradeMargin(build, scores) * 0.2 +
      getRamUpgradeMargin(build.ram, build.cpu, build.motherboard) * 0.15 +
      getStorageUpgradeMargin(build.storage, build.motherboard, scores) * 0.1,
  );

  const cpuBoard = getCpuBoardCompatibility(build.cpu, build.motherboard);
  const ramPlatform = getRamPlatformCompatibility(build.ram, build.cpu, build.motherboard);
  const psu = getPsuCompatibility(build, scores);
  const gpuBoard = getGpuBoardCompatibility(build.gpu, build.motherboard);
  const storageBoard = getStorageCompatibility(build.storage, build.motherboard);

  if (cpuBoard.socketMismatch) note = Math.min(note, 2);
  if (ramPlatform.ramTypeMismatch) note = Math.min(note, 3);
  if (psu.belowEstimatedConsumption) note = Math.min(note, 4);
  if (gpuBoard.missingGpuSlot) note = Math.min(note, 3);
  if (storageBoard.missingStorageSlot) note = Math.min(note, 6);
  if (compatibility < 5) note = Math.min(note, compatibility);

  return clamp(note);
};

const getBuildValue = (
  build: Build,
  scores: Record<string, Build>,
  compatibility: number,
  bottleneck: number,
  upgrades: number,
  currency: string,
): number => {
  if (buildParts.some((part) => !build?.[part])) return 0;

  const prices = buildParts.map((part) => getBuildPartPrice(build, part, currency));
  const totalPrice = prices.reduce((total, price) => total + price, 0);
  if (totalPrice <= 0) return 0;

  const values = buildParts.map((part) =>
    getNote(scores[part], ['Calidad precio', 'Calidad Precio']),
  );
  const weightedPartsValue = values.reduce(
    (total, value, index) => total + value * (prices[index] / totalPrice),
    0,
  );

  let note = clamp(
    weightedPartsValue *
      (0.8 + compatibility * 0.02) *
      (0.9 + bottleneck * 0.01) *
      (0.95 + upgrades * 0.005),
  );

  if (compatibility < 5) note = Math.min(note, compatibility);
  if (compatibility < 3) note = Math.min(note, 2);
  if (bottleneck < 4) note = Math.min(note, 6);

  return clamp(note);
};

export const getBuildNotes = (build: Build, currency = 'USD'): BuildNotes => {
  const scores = getComponentScores(build, currency);
  const potencia = getBuildPower(scores);
  const productividad = getBuildProductivity(scores);
  const gaming = getBuildGaming(scores);
  const eficiencia = getBuildEfficiency(scores);
  const cuelloBotella = getBuildBottleneck(scores);
  const compatibilidad = getBuildCompatibility(build, scores);
  const actualizaciones = getBuildUpgradeability(build, scores, compatibilidad);
  const calidadPrecio = getBuildValue(
    build,
    scores,
    compatibilidad,
    cuelloBotella,
    actualizaciones,
    currency,
  );

  return {
    potencia: round1(potencia),
    productividad: round1(productividad),
    gaming: round1(gaming),
    eficiencia: round1(eficiencia),
    cuelloBotella: round1(cuelloBotella),
    compatibilidad: round1(compatibilidad),
    actualizaciones: round1(actualizaciones),
    calidadPrecio: round1(calidadPrecio),
  };
};
