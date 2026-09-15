'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRightLeft, Plus, Search, Settings2, X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { setCurrencyPreference } from '@/lib/currency';

interface CreatedCombosFilterBarProps {
  count: number;
  availableCpuBrands: string[];
  availableGpuBrands: string[];
  currency: string;
  route?: string;
  entityLabel?: string;
  searchPlaceholder?: string;
  createLabel?: string;
  createPath?: string;
}

export default function CreatedCombosFilterBar({
  count,
  availableCpuBrands,
  availableGpuBrands,
  currency,
  route = '/vault/combos-created',
  entityLabel = 'combos',
  searchPlaceholder = 'Buscar combos creados',
  createLabel = 'Crear combo',
  createPath = '/vault/combos-created/new',
}: CreatedCombosFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
  const [cpuBrand, setCpuBrand] = useState(searchParams.get('cpuBrand') || '');
  const [gpuBrand, setGpuBrand] = useState(searchParams.get('gpuBrand') || '');
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
    setCpuBrand(searchParams.get('cpuBrand') || '');
    setGpuBrand(searchParams.get('gpuBrand') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setIsModalOpen(true);
  };

  const applyFilters = () => {
    navigateWithParams({
      cpuBrand: cpuBrand || null,
      gpuBrand: gpuBrand || null,
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
    });
    setIsModalOpen(false);
  };

  const clearFilters = () => {
    setCpuBrand('');
    setGpuBrand('');
    setMinPrice('');
    setMaxPrice('');
    navigateWithParams({ cpuBrand: null, gpuBrand: null, minPrice: null, maxPrice: null });
    setIsModalOpen(false);
  };

  const activeFilterCount =
    (searchParams.get('cpuBrand') ? 1 : 0) +
    (searchParams.get('gpuBrand') ? 1 : 0) +
    (searchParams.get('minPrice') ? 1 : 0) +
    (searchParams.get('maxPrice') ? 1 : 0);

  return (
    <>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex max-w-200 gap-3">
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
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
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

        <Link
          href={`${createPath}?currency=${currency}`}
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 text-[10px] font-black uppercase tracking-wider text-zinc-300 transition-colors hover:border-white hover:bg-zinc-900 hover:text-white"
        >
          {createLabel}
          <Plus size={15} />
        </Link>

        <div className="flex items-center gap-3 sm:ml-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
            {count} {entityLabel}
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
          {searchParams.get('cpuBrand') && (
            <FilterChip label={`CPU: ${searchParams.get('cpuBrand')}`} onRemove={() => navigateWithParams({ cpuBrand: null })} />
          )}
          {searchParams.get('gpuBrand') && (
            <FilterChip label={`GPU: ${searchParams.get('gpuBrand')}`} onRemove={() => navigateWithParams({ gpuBrand: null })} />
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
              <FilterSelect
                id="created-combo-cpu-brand"
                label="Marca de CPU"
                value={cpuBrand}
                options={availableCpuBrands}
                onChange={setCpuBrand}
              />
              <FilterSelect
                id="created-combo-gpu-brand"
                label="Marca de GPU"
                value={gpuBrand}
                options={availableGpuBrands}
                onChange={setGpuBrand}
              />

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Precio total
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

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-zinc-500"
      >
        <option value="">Todas las marcas</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
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
