import { GameData, FpsResult } from './types';

/**
 * Extrae dinámicamente las claves de presets disponibles para un juego dado
 * Ej: ["bajo", "medio", "ultra"]
 */
export const getAvailablePresets = (game?: GameData): string[] => {
  if (!game || !game.gpu_fps_base) return ['medio'];

  // Tomamos la primera GPU registrada en el JSON para leer sus presets
  const gpuKeys = Object.keys(game.gpu_fps_base);
  if (gpuKeys.length === 0) return ['medio'];

  const firstGpu = game.gpu_fps_base[gpuKeys[0]];
  const res1080p = firstGpu['1080p'];

  if (!res1080p) return ['medio'];

  return Object.keys(res1080p);
};

/**
 * Calcula los FPS proyectados para 1080p, 1440p y 4K según la fórmula de 4 pasos
 */
export const calculateComboFps = (
  combo: any,
  game: GameData,
  selectedPreset: string,
  scores?: { cpuGamingScore?: number; ramGamingScore?: number }
): FpsResult => {
  const defaultResult: FpsResult = { fhd: 0, qhd: 0, uhd: 0 };

  if (!combo || !game || !game.gpu_fps_base) return defaultResult;

  // 1. Identificar GPU en la tabla del juego (buscamos por slug o ID corto, ej: "rtx-5070")
  const gpuSlug = combo.gpu?.slug || combo.gpu?.id || '';
  const gpuFpsData = game.gpu_fps_base[gpuSlug];

  // Si la gráfica del combo no está mapeada en el JSON del juego
  if (!gpuFpsData) {
    return defaultResult;
  }

  // 2. Paso 2: Factor RAM (Puntuación de juegos de la RAM normalizada de 0 a 1.0)
  // Si no se provee la nota de la RAM, se asume 1.0 (100%) por defecto
  const ramScore = scores?.ramGamingScore ?? 10;
  const factorRam = Math.min(1.0, Math.max(0, ramScore / 10));

  // 3. Paso 3: Techo CPU
  // cpuGamingScore de 0 a 10 se escala a base 10,000 para comparar con cpu_score_ideal
  const cpuGamingScore = (scores?.cpuGamingScore ?? 8.5) * 1000;
  const cpuRatio = Math.min(1.0, cpuGamingScore / game.cpu_score_ideal);
  const techoCpu = cpuRatio * game.limite_motor_fps * factorRam;

  // 4. Paso 4: Resolver FPS para cada resolución min(FPS_GPU, Techo_CPU)
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