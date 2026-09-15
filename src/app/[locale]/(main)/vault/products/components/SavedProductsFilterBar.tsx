'use client';

import { FormEvent, useState } from 'react';
import { ArrowRightLeft, Search, Settings2, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { setCurrencyPreference } from '@/lib/currency';

interface SavedProductsFilterBarProps {
  count: number;
  availableBrands: string[];
  availableTypes: string[];
  currency: string;
}

const route = '/vault/products';

export default function SavedProductsFilterBar({
  count,
  availableBrands,
  availableTypes,
  currency,
}: SavedProductsFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
  const [selectedBrands, setSelectedBrands] = useState(
    searchParams.get('brand')?.split(',').filter(Boolean) || [],
  );
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

  const navigateWithParams = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(changes).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });

    params.set('page', '1');
    const query = params.toString();
    router.push(query ? `${route}?${query}` : route);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateWithParams({ q: searchValue.trim() || null });
  };

  const openFilters = () => {
    setSelectedBrands(searchParams.get('brand')?.split(',').filter(Boolean) || []);
    setSelectedType(searchParams.get('type') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setIsModalOpen(true);
  };

  const applyFilters = () => {
    navigateWithParams({
      brand: selectedBrands.length ? selectedBrands.join(',') : null,
      type: selectedType || null,
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
    });
    setIsModalOpen(false);
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedType('');
    setMinPrice('');
    setMaxPrice('');
    navigateWithParams({ brand: null, type: null, minPrice: null, maxPrice: null });
    setIsModalOpen(false);
  };

  const activeFilterCount =
    selectedBrands.length +
    (searchParams.get('type') ? 1 : 0) +
    (searchParams.get('minPrice') ? 1 : 0) +
    (searchParams.get('maxPrice') ? 1 : 0);

  return (
    <>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className='flex gap-3 max-w-200'>
          <button
          type="button"
          onClick={openFilters}
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 transition-colors hover:border-white hover:text-white"
          aria-label="Abrir filtros"
        >
          <Settings2 size={18} />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-black">
              {activeFilterCount}
            </span>
          )}
        </button>

        <form onSubmit={handleSearch} className="relative w-full">
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Buscar"
            aria-label="Buscar en productos guardados"
            className="h-12 w-full rounded-xl border border-zinc-700 bg-black px-4 pr-12 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-400"
          />
          <button
            type="submit"
            className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-zinc-500 transition-colors hover:text-white"
            aria-label="Buscar"
          >
            <Search size={18} />
          </button>
        </form>
        </div>
        

        <div className="flex items-center gap-3 sm:ml-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
            {count} guardados
          </span>
          <button
            type="button"
            onClick={() => {
              const nextCurrency: 'USD' | 'EUR' = currency === 'EUR' ? 'USD' : 'EUR';
              setCurrencyPreference(nextCurrency);
              navigateWithParams({ currency: nextCurrency });
            }}
            className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
            title="Cambiar moneda"
          >
            <ArrowRightLeft size={13} />
            {currency}
          </button>
        </div>
      </div>

      {(searchParams.get('q') || activeFilterCount > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {searchParams.get('q') && (
            <FilterChip label={`Búsqueda: ${searchParams.get('q')}`} onRemove={() => {
              setSearchValue('');
              navigateWithParams({ q: null });
            }} />
          )}
          {selectedBrands.map((brand) => (
            <FilterChip
              key={brand}
              label={brand}
              onRemove={() => {
                const nextBrands = selectedBrands.filter((item) => item !== brand);
                setSelectedBrands(nextBrands);
                navigateWithParams({ brand: nextBrands.length ? nextBrands.join(',') : null });
              }}
            />
          ))}
          {searchParams.get('type') && (
            <FilterChip label={searchParams.get('type') || ''} onRemove={() => navigateWithParams({ type: null })} />
          )}
          {(searchParams.get('minPrice') || searchParams.get('maxPrice')) && (
            <FilterChip
              label={`Precio: ${searchParams.get('minPrice') || '0'} - ${searchParams.get('maxPrice') || '∞'}`}
              onRemove={() => navigateWithParams({ minPrice: null, maxPrice: null })}
            />
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600 transition-colors hover:text-white"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Filtros</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 transition-colors hover:text-white"
                aria-label="Cerrar filtros"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Marca
                </label>
                <div className="mt-3 grid max-h-36 grid-cols-2 gap-2 overflow-y-auto">
                  {availableBrands.map((brand) => (
                    <label key={brand} className="flex items-center gap-2 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => setSelectedBrands((current) =>
                          current.includes(brand)
                            ? current.filter((item) => item !== brand)
                            : [...current, brand],
                        )}
                        className="accent-white"
                      />
                      {brand}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="saved-product-type" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Tipo
                </label>
                <select
                  id="saved-product-type"
                  value={selectedType}
                  onChange={(event) => setSelectedType(event.target.value)}
                  className="mt-3 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-zinc-500"
                >
                  <option value="">Todos los tipos</option>
                  {availableTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Rango de precio
                </span>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(event) => setMinPrice(event.target.value)}
                    placeholder="Mínimo"
                    className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-zinc-500"
                  />
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                    placeholder="Máximo"
                    className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-zinc-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-500 transition-colors hover:text-white"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-lg bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-zinc-200"
              >
                Aplicar filtros
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
