import React from 'react';
import Link from 'next/link';

interface ComboCardProps {
  combo: any;
  currency: string;
}

export default function ComboCard({ combo, currency }: ComboCardProps) {
  const isEUR = currency === 'EUR';
  const symbol = isEUR ? '€' : '$';

  // Lógica interna para calcular el precio final de cada pieza (Oferta vs Base)
  const getComponentPrice = (component: any, customUsd: number | null, customEur: number | null) => {
    if (!component) return 0;
    if (isEUR) {
      return customEur !== null && customEur !== undefined ? customEur : (component.price_base_eur || 0);
    }
    return customUsd !== null && customUsd !== undefined ? customUsd : (component.price_base_usd || 0);
  };

  const cpuPrice = getComponentPrice(combo.cpu, combo.custom_price_cpu_usd, combo.custom_price_cpu_eur);
  const gpuPrice = getComponentPrice(combo.gpu, combo.custom_price_gpu_usd, combo.custom_price_gpu_eur);
  const ramPrice = getComponentPrice(combo.ram, combo.custom_price_ram_usd, combo.custom_price_ram_eur);
  
  const totalPrice = cpuPrice + gpuPrice + ramPrice;

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition-all duration-300 hover:border-zinc-600 hover:bg-zinc-900/80">
      
      {/* Cabecera de la tarjeta */}
      <div className="mb-5">
        <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
          {combo.title}
        </h3>
      </div>

      {/* Lista de Componentes */}
      <div className="flex flex-col gap-2.5 flex-1">
        {[
          { label: 'CPU', item: combo.cpu, price: cpuPrice },
          { label: 'GPU', item: combo.gpu, price: gpuPrice },
          { label: 'RAM', item: combo.ram, price: ramPrice }
        ].map((part, idx) => (
          part.item && (
            <div key={idx} className="flex items-center justify-between rounded-xl bg-black/50 p-3 border border-zinc-900/50">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                  {part.label} · {part.item.brand}
                </span>
                <span className="text-xs font-medium text-zinc-300 mt-0.5 truncate max-w-[160px]">
                  {part.item.name}
                </span>
              </div>
              <span className="text-xs font-bold text-zinc-400">
                {symbol}{part.price.toFixed(0)}
              </span>
            </div>
          )
        ))}
      </div>

      {/* Pie de la tarjeta */}
      <div className="mt-6 pt-5 border-t border-zinc-800/80 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Total
          </span>
          <span className="text-lg font-black text-white mt-0.5">
            {symbol}{totalPrice.toFixed(2)}
          </span>
        </div>
        <Link 
          href={`/combos/${combo.slug}?currency=${currency}`}
          className="rounded-lg bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black transition-colors hover:bg-zinc-200 active:scale-95 text-center flex items-center justify-center"
        >
          Ver Combo
        </Link>
      </div>

    </div>
  );
}