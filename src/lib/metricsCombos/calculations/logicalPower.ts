import { METRIC_CEILINGS, METRIC_WEIGHTS } from '../constants';

export const calculateLogicalPower = (cpu: any): number => {
  if (!cpu || typeof cpu !== 'object') return 0;

  const benchmarks = cpu.benchmarks || {};

  // Extracción directa desde cpu.benchmarks
  const geekbench = Number(benchmarks.geekbench_single ?? 0);
  const cinebench = Number(benchmarks.cinebench_multi ?? 0);
  const passmark = Number(benchmarks.passmark_score ?? 0);

  // Normalización respecto a techos (Regla de tres)
  const geekbenchPct = Math.min(100, (geekbench / METRIC_CEILINGS.CPU.GEEKBENCH_SINGLE) * 100);
  const cinebenchPct = Math.min(100, (cinebench / METRIC_CEILINGS.CPU.CINEBENCH_MULTI) * 100);
  const passmarkPct = Math.min(100, (passmark / METRIC_CEILINGS.CPU.PASSMARK) * 100);

  // Ponderación final (40% Cinebench + 35% Geekbench + 25% Passmark)
  const score =
    cinebenchPct * METRIC_WEIGHTS.CPU.CINEBENCH +
    geekbenchPct * METRIC_WEIGHTS.CPU.GEEKBENCH +
    passmarkPct * METRIC_WEIGHTS.CPU.PASSMARK;

  return Math.min(100, Math.max(0, score));
};