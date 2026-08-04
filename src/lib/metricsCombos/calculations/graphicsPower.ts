import { METRIC_CEILINGS, METRIC_WEIGHTS } from '../constants';

export const calculateGraphicsPower = (gpu: any): number => {
  if (!gpu || typeof gpu !== 'object') return 0;

  const benchmarks = gpu.benchmarks || {};
  const specs = gpu.specs || {};

  // Extracción directa desde gpu.benchmarks y gpu.vram_capacity / specs
  const blender = Number(benchmarks.blender_score ?? 0);
  const timeSpy = Number(benchmarks['3dmark_time_spy'] ?? 0);
  const portRoyal = Number(benchmarks['3dmark_port_royal'] ?? 0);
  const vram = Number(gpu.vram_capacity ?? specs.vram_capacity ?? specs.vram ?? 12);

  // Normalización respecto a techos (Regla de tres)
  const blenderPct = Math.min(100, (blender / METRIC_CEILINGS.GPU.BLENDER) * 100);
  const timeSpyPct = Math.min(100, (timeSpy / METRIC_CEILINGS.GPU.TIME_SPY) * 100);
  const portRoyalPct = Math.min(100, (portRoyal / METRIC_CEILINGS.GPU.PORT_ROYAL) * 100);
  const vramPct = Math.min(100, (vram / METRIC_CEILINGS.GPU.VRAM_GB) * 100);

  // Ponderación final (35% Blender + 30% Time Spy + 20% VRAM + 15% Port Royal)
  const score =
    blenderPct * METRIC_WEIGHTS.GPU.BLENDER +
    timeSpyPct * METRIC_WEIGHTS.GPU.TIME_SPY +
    vramPct * METRIC_WEIGHTS.GPU.VRAM +
    portRoyalPct * METRIC_WEIGHTS.GPU.PORT_ROYAL;

  return Math.min(100, Math.max(0, score));
};