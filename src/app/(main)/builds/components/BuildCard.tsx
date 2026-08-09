import { BarChart2, Bookmark, Eye } from 'lucide-react';
import type { ReactNode } from 'react';

interface BuildCardProps {
  build: any;
  currency: string;
}

const parts = [
  { key: 'cpu', label: 'CPU' },
  { key: 'gpu', label: 'GPU' },
  { key: 'ram', label: 'RAM' },
  { key: 'motherboard', label: 'Placa base' },
  { key: 'storage', label: 'Almacenamiento' },
  { key: 'psu', label: 'Fuente' },
];

export default function BuildCard({ build, currency }: BuildCardProps) {
  const isEUR = currency === 'EUR';
  const symbol = isEUR ? '€' : '$';
  const totalPrice = parts.reduce((total, part) => {
    const product = build[part.key];
    const price = isEUR ? product?.price_base_eur : product?.price_base_usd;
    return total + (Number(price) || 0);
  }, 0);

  return (
    <article className="flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition-all duration-300 hover:border-zinc-600 hover:bg-zinc-900/80">
      <div>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
          {build.category || 'Build'}
        </span>
        <h2 className="mt-2 line-clamp-2 text-sm font-black leading-snug text-white">
          {build.title}
        </h2>

        <div className="mt-5 space-y-2 border-l border-zinc-800 pl-4">
          {parts.map((part) => {
            const product = build[part.key];
            if (!product) return null;

            return (
              <div key={part.key} className="flex min-w-0 items-baseline gap-2">
                <span className="w-24 shrink-0 text-[9px] font-black uppercase tracking-wider text-zinc-600">
                  {part.label}
                </span>
                <span className="truncate text-xs font-bold text-zinc-300" title={product.name}>
                  {product.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 border-t border-zinc-800/80 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Precio</span>
            <span className="mt-0.5 text-lg font-black text-white">
              {symbol}{totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <BuildActionButton label="Ver" icon={<Eye size={14} />} />
          <BuildActionButton label="Comparar" icon={<BarChart2 size={14} />} />
          <BuildActionButton label="Guardar" icon={<Bookmark size={14} />} />
        </div>
      </div>
    </article>
  );
}

function BuildActionButton({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      disabled
      title="Disponible próximamente"
      className="flex cursor-not-allowed items-center justify-center gap-1 rounded-lg border border-zinc-900 px-2 py-2.5 text-[9px] font-black uppercase tracking-wider text-zinc-700"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
