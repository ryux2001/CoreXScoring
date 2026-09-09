'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import type { ReactNode } from 'react';

export default function HomeCarousel({ children, label }: { children: ReactNode; label: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: -1 | 1) => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({ left: direction * container.clientWidth * 0.86, behavior: 'smooth' });
  };

  return (
    <div className="group/carousel relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label={`Ver elementos anteriores de ${label}`}
        className="absolute left-0 top-1/2 z-10 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black text-zinc-300 transition-colors hover:border-cyan-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 lg:flex"
      >
        <ChevronLeft aria-hidden="true" size={20} />
      </button>
      <div
        ref={scrollRef}
        className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 md:-mx-12 md:px-12 lg:mx-0 lg:px-0"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label={`Ver más elementos de ${label}`}
        className="absolute right-0 top-1/2 z-10 hidden h-11 w-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black text-zinc-300 transition-colors hover:border-cyan-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 lg:flex"
      >
        <ChevronRight aria-hidden="true" size={20} />
      </button>
    </div>
  );
}
