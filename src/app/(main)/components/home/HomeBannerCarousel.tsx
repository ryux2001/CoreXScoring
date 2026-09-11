'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

const banners = [
  'Carrusel-1.webp',
  'Carrusel-2.webp',
  'Carrusel-3.webp',
];

const ROTATION_INTERVAL = 5000;

export default function HomeBannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % banners.length);
    }, ROTATION_INTERVAL);

    return () => window.clearInterval(interval);
  }, [isPaused]);

  const showPrevious = () => {
    setCurrentIndex((index) => (index - 1 + banners.length) % banners.length);
  };

  const showNext = () => {
    setCurrentIndex((index) => (index + 1) % banners.length);
  };

  return (
    <div
      className="relative mx-auto aspect-[1905/988] w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 lg:mx-0 lg:max-w-none"
      aria-label="Banners destacados de CoreX Scoring"
      role="region"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {banners.map((banner, index) => (
        <Image
          key={banner}
          src={`/images/home/banner/${banner}`}
          alt={index === currentIndex ? `Banner destacado ${index + 1}` : ''}
          fill
          priority={index === 0}
          sizes="(min-width: 1024px) 42vw, calc(100vw - 2rem)"
          className={`object-cover transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden={index !== currentIndex}
        />
      ))}

      <button
        type="button"
        onClick={showPrevious}
        aria-label="Banner anterior"
        className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-transparent text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
      >
        <ChevronLeft aria-hidden="true" size={24} />
      </button>
      <button
        type="button"
        onClick={showNext}
        aria-label="Siguiente banner"
        className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-transparent text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
      >
        <ChevronRight aria-hidden="true" size={24} />
      </button>

      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-10">
        <div className="flex items-center gap-1.5" aria-label={`Banner ${currentIndex + 1} de ${banners.length}`} role="navigation">
          {banners.map((banner, index) => (
            <button
              key={banner}
              type="button"
              onClick={() => setCurrentIndex(index)}
              aria-label={`Ver banner ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : undefined}
              className={`h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${index === currentIndex ? 'w-5 bg-cyan-100' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
