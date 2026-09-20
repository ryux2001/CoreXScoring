import { describe, expect, it } from 'vitest';
import { getComparisonErrorMessage } from '@/lib/comparison-errors';
import type { CompareError } from '@/store/useCompareStore';

const translate = (key: string, values?: Record<string, string | number>) => (
  values ? `${key}:${JSON.stringify(values)}` : key
);

describe('phase 9 comparison localization contract', () => {
  it('maps comparison failures to translation keys instead of visible literals', () => {
    const errors: CompareError[] = [
      { code: 'maxSlots', maxSlots: 3 },
      { code: 'duplicate' },
      { code: 'mixed', currentType: 'CPU', incomingType: 'BUILD' },
      { code: 'mixedSnapshot' },
    ];

    expect(errors.map((error) => getComparisonErrorMessage(error, translate))).toEqual([
      'comparisonErrors.maxSlots:{"max":3}',
      'comparisonErrors.duplicate',
      'comparisonErrors.mixed:{"current":"CPU","incoming":"comparisonTypes.build"}',
      'comparisonErrors.mixedSnapshot',
    ]);
  });
});
