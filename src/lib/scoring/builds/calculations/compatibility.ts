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

/** CPU socket and chipset compatibility. */
export const getCpuBoardCompatibility = (cpu: Build, motherboard: Build) => {
  const cpuSocket = getSocket(cpu);
  const motherboardSocket = getSocket(motherboard);
  const socketMatch = !cpuSocket || !motherboardSocket
    ? BUILD_SCORING_CONFIG.COMPATIBILITY.CPU_BOARD.UNKNOWN_SOCKET
    : cpuSocket === motherboardSocket
      ? 10
      : 0;

  const cpuChipsets = asArray(getCompatibility(cpu).chipsets).map(normalize);
  const motherboardChipset = normalize(
    getCompatibility(motherboard).chipset ?? getSpecs(motherboard).chipset,
  );
  const chipsetMatch = !motherboardChipset
    ? BUILD_SCORING_CONFIG.COMPATIBILITY.CPU_BOARD.UNKNOWN_CHIPSET
    : cpuChipsets.length === 0
      ? BUILD_SCORING_CONFIG.COMPATIBILITY.CPU_BOARD.UNKNOWN_CHIPSET
      : cpuChipsets.some((chipset) => chipset.includes(motherboardChipset))
        ? 10
        : 0;

  const weights = BUILD_SCORING_CONFIG.COMPATIBILITY.CPU_BOARD;
  return {
    note: clamp(socketMatch * weights.SOCKET + chipsetMatch * weights.CHIPSET),
    socketMismatch: socketMatch === 0,
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
  const ramTypeMatch = !ramType || !cpuRamType || motherboardRamTypes.length === 0
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
  const capacityScore = !capacityLimit || !ramCapacity
    ? BUILD_SCORING_CONFIG.COMPATIBILITY.RAM_PLATFORM.UNKNOWN_CAPACITY
    : ramCapacity <= capacityLimit
      ? 10
      : 0;

  const ramFrequency = getRamFrequency(ram);
  const motherboardFrequency = getMotherboardMaxRamFrequency(motherboard);
  let frequencyScore = BUILD_SCORING_CONFIG.COMPATIBILITY.RAM_PLATFORM.UNKNOWN_FREQUENCY;
  if (ramFrequency && motherboardFrequency) {
    const frequencyConfig = BUILD_SCORING_CONFIG.COMPATIBILITY.RAM_PLATFORM;
    frequencyScore = ramFrequency <= motherboardFrequency
      ? 10
      : Math.max(frequencyConfig.MIN_FREQUENCY_SCORE, 10 - ((ramFrequency - motherboardFrequency) / motherboardFrequency) * 10);
  }

  const weights = BUILD_SCORING_CONFIG.COMPATIBILITY.RAM_PLATFORM;
  return {
    note: clamp(ramTypeMatch * weights.TYPE + capacityScore * weights.CAPACITY + frequencyScore * weights.FREQUENCY),
    ramTypeMismatch: ramTypeMatch === 0,
  };
};

/** PSU wattage headroom and connectivity compatibility. */
export const getPsuCompatibility = (build: Build, scores: BuildScores) => {
  const estimatedConsumption = getEstimatedConsumption(build);
  const recommended = estimatedConsumption * BUILD_SCORING_CONFIG.COMPATIBILITY.PSU.RECOMMENDED_MARGIN;
  const watts = getPsuWatts(build.psu);
  let wattsScore = 0;

  if (watts >= recommended) {
    wattsScore = 10;
  } else if (watts >= estimatedConsumption && recommended > estimatedConsumption) {
    wattsScore = BUILD_SCORING_CONFIG.COMPATIBILITY.PSU.PARTIAL_BASE_SCORE + ((watts - estimatedConsumption) / (recommended - estimatedConsumption)) * 4;
  } else if (estimatedConsumption > 0) {
    wattsScore = Math.max(0, BUILD_SCORING_CONFIG.COMPATIBILITY.PSU.PARTIAL_BASE_SCORE * watts / estimatedConsumption);
  }

  const connectorsScore = getNote(scores.psu, ['Conectividad']) ||
    BUILD_SCORING_CONFIG.DEFAULTS.UNKNOWN_PSU_CONNECTIVITY;
  const weights = BUILD_SCORING_CONFIG.COMPATIBILITY.PSU;
  return {
    note: clamp(wattsScore * weights.WATTAGE + connectorsScore * weights.CONNECTIVITY),
    belowEstimatedConsumption: watts < estimatedConsumption,
    criticallyBelowEstimatedConsumption: watts < estimatedConsumption * BUILD_SCORING_CONFIG.COMPATIBILITY.PSU.CRITICAL_FACTOR,
    missingRequiredConnector: false,
  };
};

/** PCIe slot and generation compatibility between GPU and motherboard. */
export const getGpuBoardCompatibility = (gpu: Build, motherboard: Build) => {
  const pcieSlots = asArray(getSpecs(motherboard).pcie_slots);
  const hasGpuSlot = pcieSlots.some((slot) => /x16/i.test(textValue(slot)) && !/\(x\d+\)/i.test(textValue(slot)));
  const gpuSlotScore = pcieSlots.length === 0
    ? BUILD_SCORING_CONFIG.COMPATIBILITY.GPU_BOARD.UNKNOWN_SLOT
    : hasGpuSlot ? 10 : 0;
  const gpuGeneration = getHighestGeneration([
    getCompatibility(gpu).pcie_generation,
    getSpecs(gpu).pcie,
  ]);
  const motherboardGeneration = getHighestGeneration([
    getSpecs(motherboard).pcie_generation,
    ...pcieSlots,
  ]);
  let generationScore = BUILD_SCORING_CONFIG.COMPATIBILITY.GPU_BOARD.UNKNOWN_GENERATION;
  if (gpuGeneration !== null && motherboardGeneration !== null) {
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
    missingGpuSlot: gpuSlotScore === 0,
  };
};

/** Storage interface, generation and remaining-slot compatibility. */
export const getStorageCompatibility = (storage: Build, motherboard: Build) => {
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
  const slotScore = m2Slots.length === 0 && sataPorts === 0
    ? BUILD_SCORING_CONFIG.COMPATIBILITY.STORAGE_BOARD.UNKNOWN_SLOT
    : compatibleSlot ? 10 : 0;

  const storageGeneration = getHighestGeneration([
    storageCompatibility.pcie_generation,
    storageSpecs.pcie_generation,
  ]);
  const motherboardGeneration = getHighestGeneration(m2Slots);
  let generationScore = BUILD_SCORING_CONFIG.COMPATIBILITY.STORAGE_BOARD.UNKNOWN_GENERATION;
  if (storageGeneration !== null && motherboardGeneration !== null) {
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

  const totalSlots = m2Slots.length + sataPorts;
  const storageConfig = BUILD_SCORING_CONFIG.COMPATIBILITY.STORAGE_BOARD;
  const marginScore = totalSlots === 0
    ? storageConfig.EMPTY_BOARD_MARGIN
    : compatibleSlot && totalSlots > 1
      ? 10
      : compatibleSlot
        ? storageConfig.SINGLE_SLOT_MARGIN
        : 0;
  const weights = BUILD_SCORING_CONFIG.COMPATIBILITY.STORAGE_BOARD;

  return {
    note: clamp(slotScore * weights.SLOT + generationScore * weights.GENERATION + marginScore * weights.MARGIN),
    missingStorageSlot: slotScore === 0,
  };
};

/** Aggregate all physical compatibility checks and apply the existing caps. */
export const getBuildCompatibility = (build: Build, scores: BuildScores): number => {
  const cpuBoard = getCpuBoardCompatibility(build.cpu, build.motherboard);
  const ramPlatform = getRamPlatformCompatibility(build.ram, build.cpu, build.motherboard);
  const psu = getPsuCompatibility(build, scores);
  const gpuBoard = getGpuBoardCompatibility(build.gpu, build.motherboard);
  const storageBoard = getStorageCompatibility(build.storage, build.motherboard);
  const platformBase = getNote(scores.motherboard, ['Compatibilidad']) ||
    BUILD_SCORING_CONFIG.DEFAULTS.UNKNOWN_COMPATIBILITY;
  const weights = BUILD_SCORING_CONFIG.COMPATIBILITY.BUILD;

  let note = clamp(
    cpuBoard.note * weights.CPU_BOARD +
      ramPlatform.note * weights.RAM_PLATFORM +
      psu.note * weights.PSU +
      gpuBoard.note * weights.GPU_BOARD +
      storageBoard.note * weights.STORAGE_BOARD +
      platformBase * weights.MOTHERBOARD_BASE,
  );

  const caps = BUILD_SCORING_CONFIG.COMPATIBILITY.CAPS;
  if (cpuBoard.socketMismatch) note = Math.min(note, caps.SOCKET_MISMATCH);
  if (ramPlatform.ramTypeMismatch) note = Math.min(note, caps.RAM_TYPE_MISMATCH);
  if (psu.belowEstimatedConsumption) note = Math.min(note, caps.PSU_BELOW_ESTIMATED);
  if (psu.criticallyBelowEstimatedConsumption) note = Math.min(note, caps.PSU_CRITICALLY_BELOW);
  if (psu.missingRequiredConnector) note = Math.min(note, caps.MISSING_PSU_CONNECTOR);
  if (gpuBoard.missingGpuSlot) note = Math.min(note, caps.MISSING_GPU_SLOT);
  if (storageBoard.missingStorageSlot) note = Math.min(note, caps.MISSING_STORAGE_SLOT);

  return clamp(note);
};
