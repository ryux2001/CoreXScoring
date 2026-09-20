import type { CompareError } from '@/store/useCompareStore';

type Translate = (key: string, values?: Record<string, string | number>) => string;

function getTypeLabel(type: string, t: Translate) {
  const normalizedType = type.toLowerCase();
  if (normalizedType === 'combo' || normalizedType === 'build') {
    return t(`comparisonTypes.${normalizedType}`);
  }

  return type;
}

export function getComparisonErrorMessage(error: CompareError, t: Translate) {
  switch (error.code) {
    case 'maxSlots':
      return t('comparisonErrors.maxSlots', { max: error.maxSlots });
    case 'duplicate':
      return t('comparisonErrors.duplicate');
    case 'mixed':
      return t('comparisonErrors.mixed', {
        current: getTypeLabel(error.currentType, t),
        incoming: getTypeLabel(error.incomingType, t),
      });
    case 'mixedSnapshot':
      return t('comparisonErrors.mixedSnapshot');
  }
}
