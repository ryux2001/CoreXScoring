'use client';

import { useEffect, useState } from 'react';
import { Layers, X } from 'lucide-react';
import BuildMainCard from './BuildMainCard';

interface MobileBuildIslandProps {
  build: any;
  currency: string;
}

export default function MobileBuildIsland({
  build,
  currency,
}: MobileBuildIslandProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsOpen(false)}
      />

      <div
        className={`fixed left-1/2 z-[100] -translate-x-1/2 overflow-hidden border border-zinc-800/80 bg-black/95 shadow-2xl backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen
            ? 'top-[90px] h-[min(82vh,760px)] w-[92vw] max-w-sm rounded-[32px]'
            : 'top-[90px] h-[44px] w-[210px] rounded-[22px]'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`absolute inset-0 flex h-full w-full cursor-pointer items-center justify-between px-4 transition-all duration-300 ${
            isOpen
              ? 'pointer-events-none scale-95 opacity-0'
              : 'scale-100 opacity-100 delay-100'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-zinc-400">
              <Layers size={12} />
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white">
              Ver piezas
            </span>
          </span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-[9px] font-bold text-emerald-400">
            6
          </span>
        </button>

        <div
          className={`absolute inset-0 h-full w-full overflow-y-auto transition-all duration-300 ${
            isOpen
              ? 'scale-100 opacity-100 delay-150'
              : 'pointer-events-none scale-95 opacity-0'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-900/80 text-zinc-400 backdrop-blur-md transition-colors hover:bg-zinc-800 hover:text-white active:scale-95"
            aria-label="Cerrar piezas"
          >
            <X size={14} />
          </button>
          <BuildMainCard build={build} currency={currency} />
        </div>
      </div>
    </>
  );
}
