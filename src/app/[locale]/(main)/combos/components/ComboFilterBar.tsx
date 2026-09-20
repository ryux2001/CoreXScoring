'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRightLeft, Search, Settings2, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { setCurrencyPreference } from '@/lib/currency';
import { useTranslations } from 'next-intl';

interface ComboFilterBarProps {
  basePath: string;
  count: number;
  availableCategories: string[];
  currency: string;
  showCurrencyToggle?: boolean;
  entityLabel: string;
  searchPlaceholder: string;
}

export default function ComboFilterBar({
  basePath,
  count,
  availableCategories,
  currency,
  showCurrencyToggle = true,
  entityLabel,
  searchPlaceholder,
}: ComboFilterBarProps) {
  const t = useTranslations('combos');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || '',
  );

  const navigateWithParams = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(changes).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });

    params.set('page', '1');
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateWithParams({ q: searchValue.trim() || null });
  };

  const openFilters = () => {
    setSelectedCategory(searchParams.get('category') || '');
    setIsModalOpen(true);
  };

  const applyFilters = () => {
    navigateWithParams({ category: selectedCategory || null });
    setIsModalOpen(false);
  };

  const clearCategory = () => {
    setSelectedCategory('');
    navigateWithParams({ category: null });
    setIsModalOpen(false);
  };

  const hasCategoryFilter = Boolean(searchParams.get('category'));

  return (
    <>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex max-w-200 gap-3">
          <button
            type="button"
            onClick={openFilters}
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 transition-colors hover:border-white hover:text-white"
            aria-label={t('openFilters')}
          >
            <Settings2 size={18} />
            {hasCategoryFilter && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-black">
                1
              </span>
            )}
          </button>

          <form onSubmit={handleSearch} className="relative w-full">
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-12 w-full rounded-xl border border-zinc-700 bg-black px-4 pr-12 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-400"
            />
            <button
              type="submit"
              className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-zinc-500 transition-colors hover:text-white"
              aria-label={t('search')}
            >
              <Search size={18} />
            </button>
          </form>
        </div>

        <div className="flex items-center gap-3 sm:ml-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
            {count} {entityLabel}
          </span>
          {showCurrencyToggle && (
            <button
              type="button"
              onClick={() => {
                const nextCurrency: 'USD' | 'EUR' = currency === 'EUR' ? 'USD' : 'EUR';
                setCurrencyPreference(nextCurrency);
                navigateWithParams({ currency: nextCurrency });
              }}
              className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
              title={t('changeCurrency')}
            >
              <ArrowRightLeft size={13} />
              {currency}
            </button>
          )}
        </div>
      </div>

      {(searchParams.get('q') || hasCategoryFilter) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {searchParams.get('q') && (
            <FilterChip
              label={t('searchFilter', { query: searchParams.get('q') ?? '' })}
              onRemove={() => {
                setSearchValue('');
                navigateWithParams({ q: null });
              }}
            />
          )}
          {hasCategoryFilter && (
            <FilterChip
              label={searchParams.get('category') || ''}
              onRemove={() => {
                setSelectedCategory('');
                navigateWithParams({ category: null });
              }}
            />
          )}
          <button
            type="button"
            onClick={clearCategory}
            className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600 transition-colors hover:text-white"
          >
            {t('clearFilters')}
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">{t('filters')}</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 transition-colors hover:text-white"
                aria-label={t('closeFilters')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {t('category')}
              </span>
              <div className="mt-3 max-h-52 space-y-3 overflow-y-auto">
                {availableCategories.length > 0 ? availableCategories.map((category) => (
                  <label key={category} className="flex items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="radio"
                      name={`combo-category-${basePath}`}
                      checked={selectedCategory === category}
                      onChange={() => setSelectedCategory(category)}
                      className="accent-white"
                    />
                    {category}
                  </label>
                )) : (
                  <p className="text-xs text-zinc-600">{t('noCategories')}</p>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={clearCategory}
                className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-500 transition-colors hover:text-white"
              >
                {t('clear')}
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-lg bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-zinc-200"
              >
                {t('applyFilters')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
    >
      {label}
      <X size={11} />
    </button>
  );
}
