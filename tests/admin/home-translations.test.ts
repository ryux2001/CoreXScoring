import { describe, expect, it } from 'vitest';
import { parseHomeEditorialTranslations, parseHomeHeroTranslations } from '@/lib/admin/home';

describe('admin home translations', () => {
  it('accepts translated section and comparison content', () => {
    expect(parseHomeEditorialTranslations({
      en: { title: 'AMD value picks', description: 'Best value AMD hardware.', eyebrow: '' },
      es: { title: 'Calidad precio AMD', description: 'El mejor hardware AMD calidad precio.', eyebrow: '' },
    })).toMatchObject({
      en: { title: 'AMD value picks' },
      es: { title: 'Calidad precio AMD' },
    });
  });

  it('requires both translated hero CTA labels', () => {
    expect(() => parseHomeHeroTranslations({
      en: { title: 'Compare hardware', description: 'Find your next PC.', primary_label: 'Explore', secondary_label: 'Compare', eyebrow: '' },
      es: { title: 'Compara hardware', description: 'Encuentra tu próximo PC.', primary_label: 'Explorar', eyebrow: '' },
    })).toThrow('acción secundaria en español');
  });
});
