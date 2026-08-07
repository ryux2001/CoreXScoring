import { GameData, FpsResult } from './types';

export * from './types';

export const getAvailablePresets = (game?: GameData): string[] => {
  if (!game || !game.gpu_fps_base) return ['medio'];

  const gpuKeys = Object.keys(game.gpu_fps_base);
  if (gpuKeys.length === 0) return ['medio'];

  // Leemos los presets disponibles de la primera GPU registrada
  const firstGpu = game.gpu_fps_base[gpuKeys[0]];
  const res1080p = firstGpu['1080p'];

  if (!res1080p) return ['medio'];

  return Object.keys(res1080p);
};

export const calculateComboFps = (
  combo: any,
  game: GameData,
  selectedPreset: string,
  scores?: { cpuGamingScore?: number; ramGamingScore?: number }
): FpsResult => {
  const defaultResult: FpsResult = { fhd: 0, qhd: 0, uhd: 0 };

  if (!combo || !game || !game.gpu_fps_base) return defaultResult;

  // Acceso directo usando el ID exacto del producto GPU
  const gpuId = combo.gpu?.id;
  if (!gpuId) return defaultResult;

  const gpuFpsData = game.gpu_fps_base[gpuId];
  if (!gpuFpsData) return defaultResult;

  // 1. Factor RAM (Score normalizado a escala 0-1)
  const ramScore = scores?.ramGamingScore ?? 10;
  const factorRam = Math.min(1.0, Math.max(0, ramScore / 10));

  // 2. Techo CPU
  const cpuGamingScore = (scores?.cpuGamingScore ?? 8.5) * 1000;
  const cpuRatio = Math.min(1.0, cpuGamingScore / game.cpu_score_ideal);
  const techoCpu = cpuRatio * game.limite_motor_fps * factorRam;

  // 3. Cálculo de FPS por resolución
  const calculateResolutionFps = (resKey: '1080p' | '1440p' | '4k'): number => {
    const resData = gpuFpsData[resKey];
    if (!resData) return 0;

    const fpsGpu = resData[selectedPreset] ?? 0;
    const fpsFinal = Math.min(fpsGpu, techoCpu);

    return Math.round(fpsFinal);
  };

  return {
    fhd: calculateResolutionFps('1080p'),
    qhd: calculateResolutionFps('1440p'),
    uhd: calculateResolutionFps('4k'),
  };
};
