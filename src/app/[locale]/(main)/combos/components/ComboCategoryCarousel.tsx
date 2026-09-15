'use client';

import {
  Children,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ComboCategoryCarouselProps {
  children: ReactNode;
}

interface CarouselState {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentPage: number;
  pageCount: number;
}

const INITIAL_STATE: CarouselState = {
  canGoNext: false,
  canGoPrevious: false,
  currentPage: 0,
  pageCount: 1,
};

export default function ComboCategoryCarousel({ children }: ComboCategoryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [carousel, setCarousel] = useState<CarouselState>(INITIAL_STATE);
  const cards = Children.toArray(children);

  const syncCarouselState = useCallback(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const maxScroll = Math.max(viewport.scrollWidth - viewport.clientWidth, 0);
    const pageCount = maxScroll === 0 ? 1 : Math.ceil(viewport.scrollWidth / viewport.clientWidth);
    const currentPage = maxScroll === 0
      ? 0
      : Math.min(pageCount - 1, Math.round((viewport.scrollLeft / maxScroll) * (pageCount - 1)));

    const nextState = {
      canGoNext: viewport.scrollLeft < maxScroll - 1,
      canGoPrevious: viewport.scrollLeft > 1,
      currentPage,
      pageCount,
    };

    setCarousel((current) => (
      current.canGoNext === nextState.canGoNext
      && current.canGoPrevious === nextState.canGoPrevious
      && current.currentPage === nextState.currentPage
      && current.pageCount === nextState.pageCount
        ? current
        : nextState
    ));
  }, []);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(syncCarouselState);
    observer.observe(viewport);
    syncCarouselState();

    return () => observer.disconnect();
  }, [cards.length, syncCarouselState]);

  const scrollToPage = (page: number) => {
    const viewport = scrollRef.current;
    if (!viewport || carousel.pageCount <= 1) return;

    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    const target = (maxScroll * page) / (carousel.pageCount - 1);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    viewport.scrollTo({ left: target, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  const move = (direction: -1 | 1) => {
    scrollToPage(Math.min(Math.max(carousel.currentPage + direction, 0), carousel.pageCount - 1));
  };

  return (
    <section className="relative">
      <div className="relative px-0 sm:px-12">
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={!carousel.canGoPrevious}
          className="absolute left-0 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black text-zinc-300 shadow-xl transition-colors hover:border-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-25 sm:flex"
          aria-label="Ver combos anteriores"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>

        <div
          ref={scrollRef}
          onScroll={syncCarouselState}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-3 motion-reduce:scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 lg:gap-6"
        >
          {cards.map((card, index) => (
            <div
              key={index}
              className="min-w-0 shrink-0 snap-start basis-full [&>*]:h-full sm:min-w-72 sm:basis-[calc((100%-1.25rem)/2)] lg:basis-[calc((100%-3rem)/3)] xl:basis-[calc((100%-4.5rem)/4)]"
            >
              {card}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => move(1)}
          disabled={!carousel.canGoNext}
          className="absolute right-0 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black text-zinc-300 shadow-xl transition-colors hover:border-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-25 sm:flex"
          aria-label="Ver más combos"
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      </div>

      {carousel.pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5" aria-label="Páginas del carrusel">
          {Array.from({ length: carousel.pageCount }, (_, page) => (
            <button
              key={page}
              type="button"
              onClick={() => scrollToPage(page)}
              className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                page === carousel.currentPage
                  ? 'w-5 bg-white'
                  : 'w-2 bg-zinc-700 hover:bg-zinc-500'
              }`}
              aria-label={`Ir a la página ${page + 1}`}
              aria-current={page === carousel.currentPage ? 'true' : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
