'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Children, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type HomeCarouselLayout = 'collection' | 'spotlight' | 'comparison';

interface CarouselState {
  currentPage: number;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  pageCount: number;
}

const INITIAL_CAROUSEL_STATE: CarouselState = {
  currentPage: 0,
  canScrollLeft: false,
  canScrollRight: false,
  pageCount: 1,
};

export default function HomeCarousel({
  children,
  label,
  layout = 'collection',
}: {
  children: ReactNode;
  label: string;
  layout?: HomeCarouselLayout;
}) {
  const t = useTranslations('home');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState<CarouselState>(INITIAL_CAROUSEL_STATE);
  const items = Children.toArray(children);
  const setScrollContainer = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    setContainer(node);
  }, []);

  useEffect(() => {
    if (!container) return;

    const updateScrollState = () => {
      const maxScroll = Math.max(container.scrollWidth - container.clientWidth, 0);
      const pageCount = maxScroll <= 1 ? 1 : Math.max(2, Math.ceil(container.scrollWidth / container.clientWidth));
      const nextState = {
        currentPage: maxScroll <= 1
          ? 0
          : Math.min(pageCount - 1, Math.round((container.scrollLeft / maxScroll) * (pageCount - 1))),
        canScrollLeft: container.scrollLeft > 1,
        canScrollRight: container.scrollLeft + container.clientWidth < container.scrollWidth - 1,
        pageCount,
      };
      setScrollState((current) => (
        current.currentPage === nextState.currentPage
        && current.canScrollLeft === nextState.canScrollLeft
        && current.canScrollRight === nextState.canScrollRight
        && current.pageCount === nextState.pageCount
          ? current
          : nextState
      ));
    };
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(container);
    updateScrollState();
    container.addEventListener('scroll', updateScrollState, { passive: true });

    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', updateScrollState);
    };
  }, [container, items.length]);

  const scroll = (direction: -1 | 1) => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({ left: direction * container.clientWidth * 0.86, behavior: 'smooth' });
  };

  const scrollToPage = (page: number) => {
    const container = scrollRef.current;
    if (!container || scrollState.pageCount <= 1) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    const target = (maxScroll * page) / (scrollState.pageCount - 1);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.scrollTo({ left: target, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <div className="home-carousel group/carousel relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label={t('carousel.previous', { label })}
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
      {scrollState.pageCount > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5" aria-label={t('carousel.pages', { label })} role="navigation">
          {Array.from({ length: scrollState.pageCount }, (_, page) => (
            <button
              key={page}
              type="button"
              onClick={() => scrollToPage(page)}
              aria-label={t('carousel.page', { page: page + 1, total: scrollState.pageCount })}
              aria-current={page === scrollState.currentPage ? 'true' : undefined}
              className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${page === scrollState.currentPage ? 'w-5 bg-cyan-100' : 'w-2 bg-zinc-700 hover:bg-zinc-500'}`}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label={t('carousel.next', { label })}
        disabled={!scrollState.canScrollRight}
        className="absolute right-0 top-1/2 z-10 hidden h-11 w-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black text-zinc-300 transition-colors hover:border-cyan-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 lg:flex"
      >
        <ChevronRight aria-hidden="true" size={20} />
      </button>
    </div>
  );
}
