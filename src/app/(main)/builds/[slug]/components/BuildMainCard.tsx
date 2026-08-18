import Image from 'next/image';
import Link from 'next/link';
import { getBuildPartPrice } from '@/lib/scoringBuilds';
import { getComponentIcon } from '@/lib/catalog/component-icons';

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

  const totalPrice = parts.reduce(
    (total, part) => total + getBuildPartPrice(build, part.key, currency),
    0,
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950/40 p-5 shadow-2xl backdrop-blur-sm lg:p-8">
      <div className="mb-6 lg:mb-8">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
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

          return (
            <div key={part.key} className="flex w-full min-w-0 flex-col gap-1.5">
              <span className="pl-1 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">
                {part.role}
              </span>

              <div className="flex min-w-0 items-stretch gap-2 sm:gap-2.5">
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl border border-zinc-900/60 bg-zinc-900/20 p-3 transition-colors hover:border-zinc-800 sm:p-3.5">
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
                      <span className="truncate text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">
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

                  <span className="shrink-0 whitespace-nowrap pl-1 text-xs font-black tracking-tight text-white sm:pl-2 sm:text-sm">
                    {isEUR
                      ? `${getBuildPartPrice(build, part.key, currency)}${symbol}`
                      : `${symbol}${getBuildPartPrice(build, part.key, currency)}`}
                  </span>
                </div>

                <Link
                  href={`/catalog/${item.slug}?currency=${currency}`}
                  className="flex min-w-17 shrink-0 items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/80 px-3.5 text-xs font-bold text-zinc-200 transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-white active:scale-95 sm:px-4"
                >
                  Ver
                </Link>
              </div>
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
