import { describe, expect, it } from 'vitest';
import { parseAdminProductPriceUpdates, parseCatalogTranslations } from '@/lib/admin/catalog';

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

  it('normalizes nullable prices, URLs and dates for an admin update', () => {
    expect(parseAdminProductPriceUpdates([{
      id: 'cpu-1',
      price_usd: 349.999,
      price_eur: null,
      price_base_usd: 399,
      price_base_eur: 379,
      price_source_url_usd: 'https://shop.example/cpu-1',
      price_source_url_eur: null,
      price_checked_at_usd: '2026-09-27',
      price_checked_at_eur: null,
    }])).toEqual([{
      id: 'cpu-1',
      price_usd: 350,
      price_eur: null,
      price_base_usd: 399,
      price_base_eur: 379,
      price_source_url_usd: 'https://shop.example/cpu-1',
      price_source_url_eur: null,
      price_checked_at_usd: '2026-09-27',
      price_checked_at_eur: null,
    }]);
  });

  it('rejects duplicate products and non-http sources', () => {
    const update = {
      id: 'cpu-1',
      price_usd: 1,
      price_eur: null,
      price_base_usd: 2,
      price_base_eur: null,
      price_source_url_usd: 'javascript:alert(1)',
      price_source_url_eur: null,
      price_checked_at_usd: '2026-09-27',
      price_checked_at_eur: null,
    };
    expect(() => parseAdminProductPriceUpdates([update])).toThrow('URL http o https');
    expect(() => parseAdminProductPriceUpdates([{ ...update, price_source_url_usd: null }, { ...update, price_source_url_usd: null }])).toThrow('repetir');
  });
});
