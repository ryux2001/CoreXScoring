import Image from 'next/image';
import Link from 'next/link';
import { getBuildPartPrice } from '@/lib/scoringBuilds';
import { getComponentIcon } from '@/lib/catalog/component-icons';
import { getComponentNotes } from '@/lib/scoring';

interface BuildMainCardProps {
  build: any;
  currency?: string;
}

const parts = [
  { key: 'cpu', role: 'Procesador' },
  { key: 'gpu', role: 'Tarjeta gráfica' },
  { key: 'ram', role: 'Memoria RAM' },
  { key: 'motherboard', role: 'Placa madre' },
  { key: 'storage', role: 'Almacenamiento' },
  { key: 'psu', role: 'Fuente' },
];

export default function BuildMainCard({
  build,
  currency = 'USD',
}: BuildMainCardProps) {
  const isEUR = currency === 'EUR';
  const symbol = isEUR ? '€' : '$';
  const draftCurrency = build?.priceModes ? currency : undefined;

  const totalPrice = parts.reduce(
    (total, part) => total + getBuildPartPrice(build, part.key, currency, draftCurrency),
    0,
  );

  const getPartValueScore = (key: string, item: any) => {
    const evaluatedPrice = getBuildPartPrice(build, key, 'USD', draftCurrency);
    const notes = getComponentNotes(item, evaluatedPrice);
    const score = notes['Calidad precio'] ?? notes['Calidad Precio'] ?? 0;

    return Number.isFinite(score) ? score : 0;
  };

  const getValueIndicatorColor = (score: number) => {
    if (score >= 9) return 'bg-purple-500';
    if (score >= 7) return 'bg-blue-500';
    if (score >= 5) return 'bg-emerald-500';
    if (score >= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950/40 p-5 shadow-2xl backdrop-blur-sm lg:p-8">
      <div className="mb-6 lg:mb-8">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          {build.category || 'Build'}
        </span>
        <h1 className="mt-2 text-xl font-black leading-snug tracking-tighter text-white md:text-2xl">
          {build.title}
        </h1>
      </div>

      <div className="mt-auto flex w-full flex-col gap-3 sm:gap-4">
        {parts.map((part) => {
          const item = build?.[part.key];
          if (!item) return null;
          const iconSrc = getComponentIcon(part.key);
          const partPrice = getBuildPartPrice(build, part.key, currency, draftCurrency);
          const priceFormatted = isEUR ? `${partPrice}${symbol}` : `${symbol}${partPrice}`;
          const valueScore = getPartValueScore(part.key, item);

          return (
            <div key={part.key} className="flex w-full min-w-0 flex-col gap-1.5">
              <span className="pl-1 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
                {part.role}
              </span>

              <Link
                href={`/catalog/${item.slug}?currency=${currency}`}
                className="group flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl border border-zinc-900/60 bg-zinc-900/20 p-3 transition-colors hover:border-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:gap-3 sm:p-3.5"
                aria-label={`Ver ${item.name} en el catálogo. Calidad precio: ${valueScore.toFixed(1)}`}
              >
                  <div className="flex min-w-0 items-center gap-2.5 overflow-hidden sm:gap-3">
                    <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-900 bg-zinc-950 sm:flex">
                      {iconSrc && (
                        <Image
                          src={iconSrc}
                          alt={`Icono de ${part.role}`}
                          width={40}
                          height={40}
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col overflow-hidden">
                      <span className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                        {item.brand}
                      </span>
                      <span
                        className="truncate text-xs font-bold text-zinc-200"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 pl-1 text-right sm:pl-2">
                    <span className="whitespace-nowrap text-xs font-black tracking-tight text-white sm:text-sm">
                      {priceFormatted}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 shrink-0 rounded-full transition-transform group-hover:scale-125 motion-reduce:animate-none animate-pulse ${getValueIndicatorColor(valueScore)}`}
                      title={`Calidad precio: ${valueScore.toFixed(1)}`}
                    />
                  </div>
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-end justify-between border-t border-zinc-900/80 pt-5">
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">
          Precio total
        </span>
        <span className="text-lg font-black text-white">
          {isEUR ? `${totalPrice.toFixed(2)}${symbol}` : `${symbol}${totalPrice.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}
