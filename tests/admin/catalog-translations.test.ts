import { describe, expect, it } from 'vitest';
import { parseCatalogTranslations } from '@/lib/admin/catalog';

describe('admin catalog translations', () => {
  it('accepts complete English and Spanish titles plus categories', () => {
    expect(parseCatalogTranslations({
      translations: {
        en: { title: 'Balanced gaming build', category: 'Gaming' },
        es: { title: 'Build gaming equilibrada', category: 'Juegos' },
      },
    })).toEqual({
      en: { title: 'Balanced gaming build', category: 'Gaming' },
      es: { title: 'Build gaming equilibrada', category: 'Juegos' },
    });
  });

  it('rejects incomplete translations', () => {
    expect(() => parseCatalogTranslations({
      translations: { en: { title: 'Only English', category: 'Gaming' } },
    })).toThrow('Faltan los textos en español');
  });
});
