import { BUILD_SCORING_CONFIG } from '../config';
import { Build, BuildScores } from '../types';
import {
  asArray,
  clamp,
  getCompatibility,
  getEstimatedConsumption,
  getHighestGeneration,
  getMaxRamSupport,
  getNote,
  getPsuWatts,
  getRamCapacity,
  getRamType,
  getSpecs,
  numberValue,
  getSocket,
  normalize,
} from '../utils';
import {
  getCpuBoardCompatibility,
  getGpuBoardCompatibility,
  getPsuCompatibility,
  getRamPlatformCompatibility,
  getStorageCompatibility,
} from './compatibility';

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
  const scores = BUILD_SCORING_CONFIG.GENERATION_SCORES;
  if (generation === 5) return scores.GEN5;
  if (generation === 4) return scores.GEN4;
  if (generation === 3) return scores.GEN3;
  return scores.UNKNOWN;
};

const getPlatformFuture = (cpu: Build, motherboard: Build): number => {
  const weights = BUILD_SCORING_CONFIG.UPGRADEABILITY.PLATFORM;
  return clamp(
    getSocketFutureScore(getSocket(motherboard) || getSocket(cpu)) * weights.SOCKET +
      getRamGenerationScore(getRamType(motherboard) || getRamType(cpu)) * weights.RAM +
      getPcieGenerationScore(getHighestGeneration([
        getSpecs(motherboard).pcie_generation,
        ...asArray(getSpecs(motherboard).pcie_slots),
      ])) * weights.PCIE,
  );
};

const getPsuUpgradeMargin = (build: Build, scores: BuildScores): number => {
  const estimatedConsumption = getEstimatedConsumption(build);
  const marginConfig = BUILD_SCORING_CONFIG.UPGRADEABILITY.PSU_MARGIN;
  const idealMargin = Math.max(
    marginConfig.MIN_IDEAL_MARGIN,
    estimatedConsumption * marginConfig.CONSUMPTION_FACTOR,
  );
  const wattMargin = clamp(((getPsuWatts(build.psu) - estimatedConsumption) / idealMargin) * 10);
  const connectivity = getNote(scores.psu, ['Conectividad']) || BUILD_SCORING_CONFIG.DEFAULTS.UNKNOWN_PSU_CONNECTIVITY;
  return clamp(wattMargin * marginConfig.WATTAGE + connectivity * marginConfig.CONNECTIVITY);
};

const getRamUpgradeMargin = (ram: Build, cpu: Build, motherboard: Build): number => {
  const maxValues = [
    getMaxRamSupport(cpu),
    numberValue(getCompatibility(motherboard).ram_max_capacity, 0),
  ].filter((value) => value > 0);
  const maxCapacity = maxValues.length ? Math.min(...maxValues) : 0;
  const currentCapacity = getRamCapacity(ram);
  const marginConfig = BUILD_SCORING_CONFIG.UPGRADEABILITY.RAM_MARGIN;
  const capacityMargin = maxCapacity && currentCapacity
    ? clamp(((maxCapacity - currentCapacity) / (maxCapacity * marginConfig.CAPACITY_DIVISOR)) * 10)
    : BUILD_SCORING_CONFIG.UPGRADEABILITY.RAM_MARGIN.UNKNOWN_CAPACITY;
  const ramSlots = numberValue(getSpecs(motherboard).ram_slots ?? getCompatibility(motherboard).ram_slots, 0);
  const slotsUsed = numberValue(getSpecs(ram).slots_used, 0);
  const slotMargin = ramSlots > 0
    ? clamp(((ramSlots - slotsUsed) / ramSlots) * 10)
    : BUILD_SCORING_CONFIG.UPGRADEABILITY.RAM_MARGIN.UNKNOWN_SLOTS;

  return clamp(
    capacityMargin * marginConfig.CAPACITY +
      getRamGenerationScore(getRamType(ram)) * marginConfig.GENERATION +
      slotMargin * marginConfig.SLOTS,
  );
};

const getStorageUpgradeMargin = (storage: Build, motherboard: Build, scores: BuildScores): number => {
  const specs = getSpecs(motherboard);
  const storageSpecs = getSpecs(storage);
  const storageCompatibility = getCompatibility(storage);
  const interfaceName = normalize([
    storageCompatibility.interface ??
      storageSpecs.interface ??
      storageCompatibility.form_factor ??
      storageSpecs.form_factor ?? '',
    storage.name ?? '',
  ].join(' '));
  const isM2 = interfaceName.includes('m.2') || interfaceName.includes('nvme') || interfaceName.includes('pcie');
  const isSata = interfaceName.includes('sata');
  const m2Slots = asArray(specs.m2_slots);
  const sataPorts = numberValue(specs.sata_ports, 0);
  const hasUsageData = specs.m2_used !== undefined || specs.sata_used !== undefined;
  const m2Used = numberValue(specs.m2_used, 0);
  const sataUsed = numberValue(specs.sata_used, 0);
  const totalSlots = m2Slots.length + sataPorts;
  const freeSlots = Math.max(0, m2Slots.length - m2Used) + Math.max(0, sataPorts - sataUsed);
  let slotsMargin: number;
  if (totalSlots > 0 && hasUsageData) {
    slotsMargin = clamp((freeSlots / totalSlots) * 10);
  } else if (isM2 && m2Slots.length > 0) {
    slotsMargin = clamp(((m2Slots.length - 1) / m2Slots.length) * 10);
  } else if (isSata && sataPorts > 0) {
    slotsMargin = clamp(((sataPorts - 1) / sataPorts) * 10);
  } else {
    slotsMargin = getNote(scores.motherboard, ['Expansión', 'Expansi\u00f3n interna', 'Expansi\u00c3\u00b3n interna', 'Expansion interna']) ||
      BUILD_SCORING_CONFIG.DEFAULTS.UNKNOWN_MOTHERBOARD_EXPANSION;
  }
  const futureGeneration = getPcieGenerationScore(getHighestGeneration([
    getCompatibility(storage).pcie_generation,
    getSpecs(storage).pcie_generation,
  ]));
  const marginConfig = BUILD_SCORING_CONFIG.UPGRADEABILITY.STORAGE_MARGIN;

  return clamp(slotsMargin * marginConfig.SLOTS + futureGeneration * marginConfig.GENERATION);
};

/** Calculate future expansion capacity and preserve the existing incompatibility caps. */
export const getBuildUpgradeability = (
  build: Build,
  scores: BuildScores,
  compatibility: number,
): number => {
  const weights = BUILD_SCORING_CONFIG.UPGRADEABILITY.BUILD;
  let note = clamp(
    getPlatformFuture(build.cpu, build.motherboard) * weights.PLATFORM +
      (getNote(scores.motherboard, ['Expansión', 'Expansi\u00f3n interna', 'Expansi\u00c3\u00b3n interna', 'Expansion interna']) || BUILD_SCORING_CONFIG.DEFAULTS.UNKNOWN_MOTHERBOARD_EXPANSION) * weights.INTERNAL_EXPANSION +
      getPsuUpgradeMargin(build, scores) * weights.PSU +
      getRamUpgradeMargin(build.ram, build.cpu, build.motherboard) * weights.RAM +
      getStorageUpgradeMargin(build.storage, build.motherboard, scores) * weights.STORAGE,
  );

  const cpuBoard = getCpuBoardCompatibility(build.cpu, build.motherboard);
  const ramPlatform = getRamPlatformCompatibility(build.ram, build.cpu, build.motherboard);
  const psu = getPsuCompatibility(build, scores);
  const gpuBoard = getGpuBoardCompatibility(build.gpu, build.motherboard);
  const storageBoard = getStorageCompatibility(build.storage, build.motherboard);

  const caps = BUILD_SCORING_CONFIG.UPGRADEABILITY.CAPS;
  if (cpuBoard.socketMismatch) note = Math.min(note, caps.SOCKET_MISMATCH);
  if (ramPlatform.ramTypeMismatch) note = Math.min(note, caps.RAM_TYPE_MISMATCH);
  if (psu.belowEstimatedConsumption) note = Math.min(note, caps.PSU_BELOW_ESTIMATED);
  if (gpuBoard.missingGpuSlot) note = Math.min(note, caps.MISSING_GPU_SLOT);
  if (storageBoard.missingStorageSlot) note = Math.min(note, caps.MISSING_STORAGE_SLOT);
  if (compatibility < BUILD_SCORING_CONFIG.VALUE.LOW_COMPATIBILITY_THRESHOLD) note = Math.min(note, compatibility);

  return clamp(note);
};
