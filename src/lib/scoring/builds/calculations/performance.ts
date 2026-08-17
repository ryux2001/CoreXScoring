import { BUILD_SCORING_CONFIG } from '../config';
import { Build, BuildScores } from '../types';
import { clamp, getNote } from '../utils';
import { getGpuGamingScore } from '@/lib/scoring/components/calculations/gpu/gpu';

/** Storage contributes secondary notes to build productivity and gaming. */
export const getStorageProductivity = (scores: Build | undefined): number => {
  const weights = BUILD_SCORING_CONFIG.PERFORMANCE.STORAGE_PRODUCTIVITY;
  return clamp(
    getNote(scores, ['Velocidad']) * weights.SPEED +
      getNote(scores, ['Durabilidad']) * weights.DURABILITY +
      getNote(scores, ['Temperaturas']) * weights.TEMPERATURES,
  );
};

export const getStorageGaming = (scores: Build | undefined): number => {
  const weights = BUILD_SCORING_CONFIG.PERFORMANCE.STORAGE_GAMING;
  return clamp(
    getNote(scores, ['Velocidad']) * weights.SPEED +
      getNote(scores, ['Temperaturas']) * weights.TEMPERATURES,
  );
};

export const getBuildPower = (scores: BuildScores): number => {
  const weights = BUILD_SCORING_CONFIG.PERFORMANCE.POWER;
  return clamp(
    getNote(scores.cpu, ['Potencia']) * weights.CPU +
      getNote(scores.gpu, ['Rasterización']) * weights.GPU +
      getNote(scores.ram, ['Velocidad']) * weights.RAM_SPEED +
      getNote(scores.ram, ['Latencia']) * weights.RAM_LATENCY +
      getNote(scores.storage, ['Velocidad']) * weights.STORAGE_SPEED,
  );
};

export const getBuildProductivity = (scores: BuildScores): number => {
  const weights = BUILD_SCORING_CONFIG.PERFORMANCE.PRODUCTIVITY;
  return clamp(
    getNote(scores.cpu, ['Productividad']) * weights.CPU +
      getNote(scores.gpu, ['Productividad']) * weights.GPU +
      getNote(scores.ram, ['Productividad']) * weights.RAM +
      getStorageProductivity(scores.storage) * weights.STORAGE,
  );
};

export const getBuildGaming = (scores: BuildScores): number => {
  const weights = BUILD_SCORING_CONFIG.PERFORMANCE.GAMING;
  return clamp(
    getGpuGamingScore(scores.gpu) * weights.GPU +
      getNote(scores.cpu, ['Gaming', 'Juegos']) * weights.CPU +
      getNote(scores.ram, ['Gaming', 'Juegos']) * weights.RAM +
      getStorageGaming(scores.storage) * weights.STORAGE,
  );
};

export const getBuildEfficiency = (scores: BuildScores): number => {
  const weights = BUILD_SCORING_CONFIG.PERFORMANCE.EFFICIENCY;
  return clamp(
    getNote(scores.gpu, ['Eficiencia']) * weights.GPU +
      getNote(scores.cpu, ['Eficiencia']) * weights.CPU +
      getNote(scores.psu, ['Eficiencia']) * weights.PSU +
      getNote(scores.storage, ['Eficiencia']) * weights.STORAGE,
  );
};

export const getBuildBottleneck = (scores: BuildScores): number => {
  const weights = BUILD_SCORING_CONFIG.PERFORMANCE.BOTTLENECK;
  const cpuGaming = getNote(scores.cpu, ['Gaming', 'Juegos']);
  const gpuGaming = getGpuGamingScore(scores.gpu);
  const ramGaming = getNote(scores.ram, ['Gaming', 'Juegos']);
  const storageGaming = getStorageGaming(scores.storage);
  const mainLevel = Math.max(cpuGaming, gpuGaming);
  const friction =
    Math.abs(cpuGaming - gpuGaming) * weights.CPU_GPU_DELTA +
    Math.max(0, mainLevel - ramGaming) * weights.RAM_DELTA +
    Math.max(0, mainLevel - storageGaming) * weights.STORAGE_DELTA;

  return clamp(10 - friction * weights.FRICTION_MULTIPLIER);
};
