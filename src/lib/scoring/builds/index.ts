import { BUILD_PARTS, type Build, type BuildNotes } from './types';
import { getComponentScores } from './calculations/component-scores';
import {
  getBuildBottleneck,
  getBuildEfficiency,
  getBuildGaming,
  getBuildPower,
  getBuildProductivity,
} from './calculations/performance';
import { getBuildCompatibility } from './calculations/compatibility';
import { getBuildUpgradeability } from './calculations/upgradeability';
import { getBuildValue } from './calculations/value';
import { round1 } from './utils';

const getEmptyBuildNotes = (): BuildNotes => ({
  potencia: 0,
  productividad: 0,
  gaming: 0,
  eficiencia: 0,
  cuelloBotella: 0,
  compatibilidad: 0,
  actualizaciones: 0,
  calidadPrecio: 0,
});

const hasCompleteBuild = (build: Build): boolean => (
  BUILD_PARTS.every((part) => Boolean(build?.[part]))
);

/**
 * Build scoring orchestrator.
 *
 * The orchestrator only controls calculation order. Formula details and
 * editable coefficients live in ./calculations and ./config respectively.
 */
export const getBuildNotes = (build: Build, currency = 'USD'): BuildNotes => {
  if (!hasCompleteBuild(build)) return getEmptyBuildNotes();

  // Component notes use USD for their quality/price score, as before. The
  // active currency is still passed to the build-level value calculation.
  const scores = getComponentScores(build, 'USD', currency);
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

// Public helper retained because build cards and comparison screens use it.
export { getBuildPartPrice } from './calculations/prices';
export type { Build, BuildNotes } from './types';
