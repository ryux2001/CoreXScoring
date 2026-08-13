/**
 * Public result returned by the build scoring orchestrator.
 * Property names are kept unchanged because the UI consumes them directly.
 */
export interface BuildNotes {
  potencia: number;
  productividad: number;
  gaming: number;
  eficiencia: number;
  cuelloBotella: number;
  compatibilidad: number;
  actualizaciones: number;
  calidadPrecio: number;
}

/** Database rows are intentionally flexible because component JSONB fields vary by type. */
export type Build = Record<string, any>;
export type BuildScores = Record<string, Build>;
export const BUILD_PARTS = ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu'] as const;
export type BuildPart = (typeof BUILD_PARTS)[number];
