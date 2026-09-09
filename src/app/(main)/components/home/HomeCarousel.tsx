'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Children, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type HomeCarouselLayout = 'collection' | 'spotlight' | 'comparison';

export default function HomeCarousel({
  children,
  label,
  layout = 'collection',
}: {
  children: ReactNode;
  label: string;
  layout?: HomeCarouselLayout;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
  const items = Children.toArray(children);
  const setScrollContainer = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    setContainer(node);
  }, []);

  useEffect(() => {
    if (!container) return;

    const updateScrollState = () => {
      const nextState = {
        canScrollLeft: container.scrollLeft > 1,
        canScrollRight: container.scrollLeft + container.clientWidth < container.scrollWidth - 1,
      };
      setScrollState((current) => (
        current.canScrollLeft === nextState.canScrollLeft && current.canScrollRight === nextState.canScrollRight
          ? current
          : nextState
      ));
    };
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(container);
    container.addEventListener('scroll', updateScrollState, { passive: true });

    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', updateScrollState);
    };
  }, [container]);

  const scroll = (direction: -1 | 1) => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({ left: direction * container.clientWidth * 0.86, behavior: 'smooth' });
  };

  return (
    <div className="home-carousel group/carousel relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label={`Ver elementos anteriores de ${label}`}
        disabled={!scrollState.canScrollLeft}
        className="absolute left-0 top-1/2 z-10 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black text-zinc-300 transition-colors hover:border-cyan-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 lg:flex"
      >
        <ChevronLeft aria-hidden="true" size={20} />
      </button>
      <div
        ref={setScrollContainer}
        className="home-carousel-viewport -mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 md:-mx-12 md:px-12 lg:mx-0 lg:px-0"
      >
        {items.map((item, index) => (
          <div key={index} className={`home-carousel-item home-carousel-item--${layout} min-w-0 shrink-0 snap-start`}>
            {item}
          </div>
        ))}
      </div>
      {scrollState.canScrollLeft && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[-1rem] z-[1] hidden w-10 bg-gradient-to-r from-black/60 via-black/25 to-transparent sm:left-[-1.5rem] md:left-[-3rem] md:block lg:left-0" />}
      {scrollState.canScrollRight && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-[-1rem] z-[1] hidden w-10 bg-gradient-to-l from-black/60 via-black/25 to-transparent sm:right-[-1.5rem] md:right-[-3rem] md:block lg:right-0" />}
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label={`Ver más elementos de ${label}`}
        disabled={!scrollState.canScrollRight}
        className="absolute right-0 top-1/2 z-10 hidden h-11 w-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black text-zinc-300 transition-colors hover:border-cyan-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 lg:flex"
      >
        <ChevronRight aria-hidden="true" size={20} />
      </button>
    </div>
  );
}
