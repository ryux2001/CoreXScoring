/**
 * MOTHERBOARD TECHNOLOGIES SCORE CALCULATOR
 *
 * Rewards meaningful board features: audio hardware, BIOS recovery and
 * diagnostics, serviceability, tuning controls and firmware behavior. RGB,
 * color and warranty language are intentionally ignored.
 */

import { MOTHERBOARD_CONFIG } from '../../config/motherboard';
import {
  getAudioScore,
  getBenchmarks,
  getTechnologyText,
  interpolate,
  parseArray,
  getSpecs,
  score10,
} from './normalization';

export const calculateTechnologiesScore = (product: any): number => {
  const specs = getSpecs(product);
  const bios = parseArray(specs.bios_features).join(' ').toLowerCase();
  const text = getTechnologyText(product);

  const recoveryScore = bios.includes('flashback') || bios.includes('flash bios') || bios.includes('q-flash plus')
    ? 10
    : bios.includes('dualbios')
      ? 9
      : bios.includes('ez flash') || bios.includes('q-flash') || bios.includes('crashfree')
        ? 7
        : bios.includes('click bios')
          ? 5
          : 4;
  const diagnosticsScore = bios.includes('q-code')
    ? 10
    : bios.includes('q-led') || bios.includes('debug led') || bios.includes('ez debug')
      ? 7.5
      : bios.includes('clear cmos') || bios.includes('dualbios')
        ? 7
        : 3;
  const convenienceScore = /q-release|ez-latch|ez m\.2|m\.2 clip|shield frozr/.test(text)
    ? 10
    : /clear cmos|auto driver|multi-key|tool.?less/.test(text)
      ? 7
      : 3;
  const tuningScore = /dynamic oc|ai overclock|ai cooling|perfdrive|dimm flex|oc switcher/.test(text)
    ? 10
    : /core boost|memory boost|noise cancel/.test(text)
      ? 7
      : /thermal design|passive chipset|ultra performance vrm/.test(text)
        ? 6
        : 4;
  const bootScore = interpolate(
    Number(getBenchmarks(product).boot_time_seconds),
    MOTHERBOARD_CONFIG.TECNOLOGIAS.BOOT_ANCHORS,
  );
  const weights = MOTHERBOARD_CONFIG.TECNOLOGIAS.WEIGHTS;

  return score10(
    getAudioScore(product) * weights.AUDIO +
    recoveryScore * weights.BIOS_RECOVERY +
    diagnosticsScore * weights.DIAGNOSTICS +
    convenienceScore * weights.BUILD_CONVENIENCE +
    tuningScore * weights.TUNING +
    bootScore * weights.BOOT,
  );
};
