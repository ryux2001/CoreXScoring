import { BUILD_SCORING_CONFIG } from '../config';
import { Build, BuildScores } from '../types';
import {
  asArray,
  clamp,
  getCompatibility,
  getEstimatedConsumption,
  getHighestGeneration,
  getMaxRamSupport,
  getMotherboardMaxRamFrequency,
  getMotherboardRamTypes,
  getNote,
  getRamCapacity,
  getRamFrequency,
  getRamType,
  getSocket,
  getSpecs,
  getPsuWatts,
  normalize,
  numberValue,
  textValue,
} from '../utils';

type CompatibilityCheck = {
  note: number;
  confidence: number;
};

export type BuildCompatibilityAssessment = {
  note: number;
  confidence: number;
};

const hasOwnData = (record: Build, key: string): boolean => (
  Object.prototype.hasOwnProperty.call(record, key) &&
  record[key] !== null &&
  record[key] !== undefined &&
  record[key] !== ''
);

const getConnectorOptionMatch = (
  requirement: string,
  connectors: Build,
): boolean | null => {
  const normalized = normalize(requirement);
  const count = Math.max(1, numberValue(normalized.match(/(\d+)\s*x/)?.[1], 1));
  const pcieEightPin = numberValue(connectors.pcie_6plus2, 0);
  const nativeHighPower = numberValue(connectors.pcie_12vhpwr, 0) +
    numberValue(connectors.pcie_12v2x6, 0);

  if (/16\s*-?\s*pin|12v-?2x6/.test(normalized)) {
    return nativeHighPower >= count || pcieEightPin >= count * 3;
  }
  if (/12vhpwr|12\s*-?\s*pin/.test(normalized)) {
    return nativeHighPower >= count || pcieEightPin >= count * 2;
  }
  if (/8\s*-?\s*pin/.test(normalized)) return pcieEightPin >= count;
  if (/6\s*-?\s*pin/.test(normalized)) return pcieEightPin >= count;
  return null;
};

/** CPU socket and chipset compatibility. */
export const getCpuBoardCompatibility = (cpu: Build, motherboard: Build) => {
  const cpuSocket = getSocket(cpu);
  const motherboardSocket = getSocket(motherboard);
  const socketKnown = Boolean(cpuSocket && motherboardSocket);
  const socketMatch = !socketKnown
    ? BUILD_SCORING_CONFIG.COMPATIBILITY.CPU_BOARD.UNKNOWN_SOCKET
    : cpuSocket === motherboardSocket
      ? 10
      : 0;

  const cpuCompatibility = getCompatibility(cpu);
  const motherboardCompatibility = getCompatibility(motherboard);
  const motherboardSpecs = getSpecs(motherboard);
  const cpuChipsets = asArray(
    cpuCompatibility.chipsets ?? cpuCompatibility.chipset,
  ).map(normalize);
  const motherboardChipsets = asArray(
    motherboardCompatibility.chipsets ??
      motherboardCompatibility.chipset ??
      motherboardSpecs.chipsets ??
      motherboardSpecs.chipset,
  ).map(normalize);
  const chipsetKnown = cpuChipsets.length > 0 && motherboardChipsets.length > 0;
  const chipsetMatch = !chipsetKnown
    ? BUILD_SCORING_CONFIG.COMPATIBILITY.CPU_BOARD.UNKNOWN_CHIPSET
    : cpuChipsets.some((cpuChipset) =>
        motherboardChipsets.some((motherboardChipset) =>
          cpuChipset === motherboardChipset ||
          cpuChipset.includes(motherboardChipset) ||
          motherboardChipset.includes(cpuChipset),
        ),
      )
      ? 10
      : 0;

  const weights = BUILD_SCORING_CONFIG.COMPATIBILITY.CPU_BOARD;
  return {
    note: clamp(socketMatch * weights.SOCKET + chipsetMatch * weights.CHIPSET),
    confidence: weights.SOCKET * Number(socketKnown) + weights.CHIPSET * Number(chipsetKnown),
    socketMismatch: socketKnown && socketMatch === 0,
  };
};

/** RAM type, capacity and frequency compatibility with the platform. */
export const getRamPlatformCompatibility = (
  ram: Build,
  cpu: Build,
  motherboard: Build,
) => {
  const ramType = getRamType(ram);
  const cpuRamType = getRamType(cpu);
  const motherboardRamTypes = getMotherboardRamTypes(motherboard);
  const typeKnown = Boolean(ramType && cpuRamType && motherboardRamTypes.length > 0);
  const ramTypeMatch = !typeKnown
    ? BUILD_SCORING_CONFIG.COMPATIBILITY.RAM_PLATFORM.UNKNOWN_TYPE
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
  const capacityKnown = capacityLimit > 0 && ramCapacity > 0;
  const capacityScore = !capacityKnown
    ? BUILD_SCORING_CONFIG.COMPATIBILITY.RAM_PLATFORM.UNKNOWN_CAPACITY
    : ramCapacity <= capacityLimit
      ? 10
      : 0;

  const ramFrequency = getRamFrequency(ram);
  const motherboardFrequency = getMotherboardMaxRamFrequency(motherboard);
  const frequencyKnown = ramFrequency > 0 && motherboardFrequency > 0;
  let frequencyScore: number = BUILD_SCORING_CONFIG.COMPATIBILITY.RAM_PLATFORM.UNKNOWN_FREQUENCY;
  if (frequencyKnown) {
    const frequencyConfig = BUILD_SCORING_CONFIG.COMPATIBILITY.RAM_PLATFORM;
    frequencyScore = ramFrequency <= motherboardFrequency
      ? 10
      : Math.max(frequencyConfig.MIN_FREQUENCY_SCORE, 10 - ((ramFrequency - motherboardFrequency) / motherboardFrequency) * 10);
  }

  const weights = BUILD_SCORING_CONFIG.COMPATIBILITY.RAM_PLATFORM;
  return {
    note: clamp(ramTypeMatch * weights.TYPE + capacityScore * weights.CAPACITY + frequencyScore * weights.FREQUENCY),
    confidence:
      weights.TYPE * Number(typeKnown) +
      weights.CAPACITY * Number(capacityKnown) +
      weights.FREQUENCY * Number(frequencyKnown),
    ramTypeMismatch: typeKnown && ramTypeMatch === 0,
  };
};

/** PSU wattage headroom and connectivity compatibility. */
export const getPsuCompatibility = (build: Build, scores: BuildScores) => {
  const estimatedConsumption = getEstimatedConsumption(build);
  const recommended = estimatedConsumption * BUILD_SCORING_CONFIG.COMPATIBILITY.PSU.RECOMMENDED_MARGIN;
  const watts = getPsuWatts(build.psu);
  const wattageKnown = watts > 0 && estimatedConsumption > 0;
  let wattsScore = 0;

  if (!wattageKnown) {
    wattsScore = 5;
  } else if (watts >= recommended) {
    wattsScore = 10;
  } else if (watts >= estimatedConsumption && recommended > estimatedConsumption) {
    wattsScore = BUILD_SCORING_CONFIG.COMPATIBILITY.PSU.PARTIAL_BASE_SCORE + ((watts - estimatedConsumption) / (recommended - estimatedConsumption)) * 4;
  } else if (estimatedConsumption > 0) {
    wattsScore = Math.max(0, BUILD_SCORING_CONFIG.COMPATIBILITY.PSU.PARTIAL_BASE_SCORE * watts / estimatedConsumption);
  }

  const gpuRequirements = asArray(getCompatibility(build.gpu).power_connectors)
    .map(textValue)
    .filter(Boolean);
  const psuConnectors = getSpecs(build.psu).connectors;
  const hasConnectorInventory = Boolean(
    psuConnectors && typeof psuConnectors === 'object' && Object.keys(psuConnectors).length > 0,
  );
  const connectorMatches = hasConnectorInventory
    ? gpuRequirements
        .map((requirement) => getConnectorOptionMatch(requirement, psuConnectors))
        .filter((match): match is boolean => match !== null)
    : [];
  const gpuTdp = numberValue(getSpecs(build.gpu).tdp ?? getSpecs(build.gpu).power, 0);
  const noExternalConnectorRequired = gpuRequirements.length === 0 && gpuTdp > 0 && gpuTdp <= 75;
  const connectorKnown = noExternalConnectorRequired || connectorMatches.length > 0;
  const connectorMatch = noExternalConnectorRequired || connectorMatches.some(Boolean);
  const connectorsScore = connectorKnown
    ? connectorMatch ? 10 : 0
    : getNote(scores.psu, ['Conectividad']) ||
      BUILD_SCORING_CONFIG.DEFAULTS.UNKNOWN_PSU_CONNECTIVITY;
  const weights = BUILD_SCORING_CONFIG.COMPATIBILITY.PSU;
  return {
    note: clamp(wattsScore * weights.WATTAGE + connectorsScore * weights.CONNECTIVITY),
    confidence:
      weights.WATTAGE * Number(wattageKnown) +
      weights.CONNECTIVITY * Number(connectorKnown),
    belowEstimatedConsumption: wattageKnown && watts < estimatedConsumption,
    criticallyBelowEstimatedConsumption:
      wattageKnown && watts < estimatedConsumption * BUILD_SCORING_CONFIG.COMPATIBILITY.PSU.CRITICAL_FACTOR,
    missingRequiredConnector: connectorKnown && !connectorMatch,
  };
};

/** PCIe slot and generation compatibility between GPU and motherboard. */
export const getGpuBoardCompatibility = (gpu: Build, motherboard: Build) => {
  const motherboardSpecs = getSpecs(motherboard);
  const pcieSlotDataKnown = hasOwnData(motherboardSpecs, 'pcie_slots');
  const pcieSlots = asArray(motherboardSpecs.pcie_slots);
  const hasGpuSlot = pcieSlots.some((slot) => /x16/i.test(textValue(slot)) && !/\(x\d+\)/i.test(textValue(slot)));
  const gpuSlotScore = !pcieSlotDataKnown
    ? BUILD_SCORING_CONFIG.COMPATIBILITY.GPU_BOARD.UNKNOWN_SLOT
    : hasGpuSlot ? 10 : 0;
  const gpuGeneration = getHighestGeneration([
    getCompatibility(gpu).pcie_generation,
    getSpecs(gpu).pcie,
  ]);
  const motherboardGeneration = getHighestGeneration([
    motherboardSpecs.pcie_generation,
    ...pcieSlots,
  ]);
  const generationKnown = gpuGeneration !== null && motherboardGeneration !== null;
  let generationScore: number = BUILD_SCORING_CONFIG.COMPATIBILITY.GPU_BOARD.UNKNOWN_GENERATION;
  if (generationKnown) {
    const difference = gpuGeneration - motherboardGeneration;
    const generationScores = BUILD_SCORING_CONFIG.GENERATION_SCORES;
    generationScore = difference <= 0
      ? generationScores.GEN5
      : difference === 1
        ? generationScores.ONE_LEVEL_BEHIND
        : difference === 2
          ? generationScores.TWO_LEVELS_BEHIND
          : generationScores.MORE_THAN_TWO_LEVELS_BEHIND;
  }

  const weights = BUILD_SCORING_CONFIG.COMPATIBILITY.GPU_BOARD;
  return {
    note: clamp(gpuSlotScore * weights.SLOT + generationScore * weights.GENERATION),
    confidence:
      weights.SLOT * Number(pcieSlotDataKnown) +
      weights.GENERATION * Number(generationKnown),
    missingGpuSlot: pcieSlotDataKnown && gpuSlotScore === 0,
  };
};

/** Storage interface, generation and remaining-slot compatibility. */
export const getStorageCompatibility = (storage: Build, motherboard: Build) => {
  const storageCompatibility = getCompatibility(storage);
  const storageSpecs = getSpecs(storage);
  const interfaceName = normalize([
    storageCompatibility.interface ??
      storageSpecs.interface ??
      storageCompatibility.form_factor ??
      storageSpecs.form_factor ?? '',
    storage.name ?? '',
  ].join(' '));
  const isM2 = interfaceName.includes('m.2') || interfaceName.includes('nvme') || interfaceName.includes('pcie');
  const isSata = interfaceName.includes('sata');
  const interfaceKnown = isM2 || isSata;
  const motherboardSpecs = getSpecs(motherboard);
  const hasM2Data = hasOwnData(motherboardSpecs, 'm2_slots');
  const hasSataData = hasOwnData(motherboardSpecs, 'sata_ports');
  const m2Slots = asArray(motherboardSpecs.m2_slots);
  const sataPorts = numberValue(motherboardSpecs.sata_ports, 0);
  const relevantSlotKnown = isM2 ? hasM2Data : isSata ? hasSataData : false;
  const compatibleSlot = isM2
    ? m2Slots.length > 0
    : isSata
      ? sataPorts > 0
      : false;
  const slotScore = !interfaceKnown || !relevantSlotKnown
    ? BUILD_SCORING_CONFIG.COMPATIBILITY.STORAGE_BOARD.UNKNOWN_SLOT
    : compatibleSlot ? 10 : 0;

  const storageGeneration = getHighestGeneration([
    storageCompatibility.pcie_generation,
    storageSpecs.pcie_generation,
  ]);
  const motherboardGeneration = getHighestGeneration(m2Slots);
  const generationKnown = isSata || (
    isM2 && storageGeneration !== null && motherboardGeneration !== null
  );
  let generationScore: number = BUILD_SCORING_CONFIG.COMPATIBILITY.STORAGE_BOARD.UNKNOWN_GENERATION;
  if (isSata) {
    generationScore = 10;
  } else if (generationKnown && storageGeneration !== null && motherboardGeneration !== null) {
    const difference = storageGeneration - motherboardGeneration;
    const generationScores = BUILD_SCORING_CONFIG.GENERATION_SCORES;
    generationScore = difference <= 0
      ? generationScores.GEN5
      : difference === 1
        ? generationScores.ONE_LEVEL_BEHIND
        : difference === 2
          ? generationScores.TWO_LEVELS_BEHIND
          : generationScores.MORE_THAN_TWO_LEVELS_BEHIND;
  }

  const relevantSlots = isM2 ? m2Slots.length : isSata ? sataPorts : 0;
  const storageConfig = BUILD_SCORING_CONFIG.COMPATIBILITY.STORAGE_BOARD;
  const marginKnown = interfaceKnown && relevantSlotKnown;
  const marginScore = !marginKnown
    ? storageConfig.EMPTY_BOARD_MARGIN
    : compatibleSlot && relevantSlots > 1
      ? 10
      : compatibleSlot
        ? storageConfig.SINGLE_SLOT_MARGIN
        : 0;
  const weights = BUILD_SCORING_CONFIG.COMPATIBILITY.STORAGE_BOARD;

  return {
    note: clamp(slotScore * weights.SLOT + generationScore * weights.GENERATION + marginScore * weights.MARGIN),
    confidence:
      weights.SLOT * Number(interfaceKnown && relevantSlotKnown) +
      weights.GENERATION * Number(generationKnown) +
      weights.MARGIN * Number(marginKnown),
    missingStorageSlot: interfaceKnown && relevantSlotKnown && slotScore === 0,
  };
};

/** Aggregate physical compatibility and report how much was actually verified. */
export const getBuildCompatibilityAssessment = (
  build: Build,
  scores: BuildScores,
): BuildCompatibilityAssessment => {
  const cpuBoard = getCpuBoardCompatibility(build.cpu, build.motherboard);
  const ramPlatform = getRamPlatformCompatibility(build.ram, build.cpu, build.motherboard);
  const psu = getPsuCompatibility(build, scores);
  const gpuBoard = getGpuBoardCompatibility(build.gpu, build.motherboard);
  const storageBoard = getStorageCompatibility(build.storage, build.motherboard);
  const weights = BUILD_SCORING_CONFIG.COMPATIBILITY.BUILD;
  const platformValue = scores.motherboard?.Compatibilidad;
  const platformKnown = typeof platformValue === 'number' && Number.isFinite(platformValue);
  const platformBase = platformKnown
    ? clamp(platformValue)
    : BUILD_SCORING_CONFIG.DEFAULTS.UNKNOWN_COMPATIBILITY;
  const relationalChecks: Array<{ check: CompatibilityCheck; weight: number }> = [
    { check: cpuBoard, weight: weights.CPU_BOARD },
    { check: ramPlatform, weight: weights.RAM_PLATFORM },
    { check: psu, weight: weights.PSU },
    { check: gpuBoard, weight: weights.GPU_BOARD },
    { check: storageBoard, weight: weights.STORAGE_BOARD },
  ];

  let note = clamp(
    relationalChecks.reduce(
      (total, entry) => total + entry.check.note * entry.weight,
      0,
    ) +
      platformBase * weights.MOTHERBOARD_BASE,
  );
  const confidence = clamp(
    relationalChecks.reduce(
      (total, entry) => total + entry.check.confidence * entry.weight,
      0,
    ) + Number(platformKnown) * weights.MOTHERBOARD_BASE,
    0,
    1,
  );

  const caps = BUILD_SCORING_CONFIG.COMPATIBILITY.CAPS;
  if (cpuBoard.socketMismatch) note = Math.min(note, caps.SOCKET_MISMATCH);
  if (ramPlatform.ramTypeMismatch) note = Math.min(note, caps.RAM_TYPE_MISMATCH);
  if (psu.belowEstimatedConsumption) note = Math.min(note, caps.PSU_BELOW_ESTIMATED);
  if (psu.criticallyBelowEstimatedConsumption) note = Math.min(note, caps.PSU_CRITICALLY_BELOW);
  if (psu.missingRequiredConnector) note = Math.min(note, caps.MISSING_PSU_CONNECTOR);
  if (gpuBoard.missingGpuSlot) note = Math.min(note, caps.MISSING_GPU_SLOT);
  if (storageBoard.missingStorageSlot) note = Math.min(note, caps.MISSING_STORAGE_SLOT);

  return {
    note: clamp(note),
    confidence,
  };
};

export const getBuildCompatibility = (build: Build, scores: BuildScores): number =>
  getBuildCompatibilityAssessment(build, scores).note;
