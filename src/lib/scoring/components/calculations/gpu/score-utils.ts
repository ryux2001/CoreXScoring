export type ScoreAnchor = readonly [value: number, score: number];

export function parseJsonb<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return (value ?? fallback) as T;
}

export function interpolateScore(value: number, anchors: readonly ScoreAnchor[]): number {
  if (!Number.isFinite(value) || value <= 0 || anchors.length === 0) return 0;

  const first = anchors[0];
  const last = anchors[anchors.length - 1];

  if (value <= first[0]) return first[1];
  if (value >= last[0]) return last[1];

  for (let index = 1; index < anchors.length; index += 1) {
    const lower = anchors[index - 1];
    const upper = anchors[index];

    if (value <= upper[0]) {
      const progress = (value - lower[0]) / (upper[0] - lower[0]);
      return lower[1] + (upper[1] - lower[1]) * progress;
    }
  }

  return last[1];
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(10, value));
}

export function getGpuTechnologyText(technologies: unknown, description = ''): string {
  const parsed = parseJsonb<unknown[]>(technologies, []);
  const technologyText = Array.isArray(parsed)
    ? parsed
      .map((technology) => {
        if (!technology || typeof technology !== 'object') return '';
        const item = technology as { name?: unknown; description?: unknown };
        return `${String(item.name ?? '')} ${String(item.description ?? '')}`;
      })
      .join(' ')
    : '';

  return `${technologyText} ${description}`.trim();
}
