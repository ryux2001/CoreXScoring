'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

const banners = [
  { src: 'Carrusel-1.webp', altKey: 'banner.alts.comparison' },
  { src: 'Carrusel-2.webp', altKey: 'banner.alts.catalog' },
  { src: 'Carrusel-3.webp', altKey: 'banner.alts.evaluation' },
] as const;

const ROTATION_INTERVAL = 5000;

export default function HomeBannerCarousel() {
  const t = useTranslations('home');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    if (isPaused || isHovered || isFocused || prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % banners.length);
    }, ROTATION_INTERVAL);

    return () => window.clearInterval(interval);
  }, [isFocused, isHovered, isPaused, prefersReducedMotion]);

  const showPrevious = () => {
    setCurrentIndex((index) => (index - 1 + banners.length) % banners.length);
  };

  const showNext = () => {
    setCurrentIndex((index) => (index + 1) % banners.length);
  };

  return (
    <div
      className="relative mx-auto aspect-[1905/988] w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 lg:mx-0 lg:max-w-none"
      aria-label={t('banner.regionLabel')}
      aria-roledescription={t('banner.roleDescription')}
      role="region"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false);
      }}
    >
      {banners.map((banner, index) => (
        <Image
          key={banner.src}
          src={`/images/home/banner/${banner.src}`}
          alt={index === currentIndex ? t(banner.altKey) : ''}
          fill
          priority={index === 0}
          sizes="(min-width: 1024px) 42vw, (min-width: 768px) calc(100vw - 6rem), calc(100vw - 2rem)"
          className={`object-cover transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden={index !== currentIndex}
        />
      ))}

      <button
        type="button"
        onClick={showPrevious}
        aria-label={t('banner.previous')}
        className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-transparent text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
      >
        <ChevronLeft aria-hidden="true" size={24} />
      </button>
      <button
        type="button"
        onClick={showNext}
        aria-label={t('banner.next')}
        className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-transparent text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
      >
        <ChevronRight aria-hidden="true" size={24} />
      </button>

      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-10">
        <div className="flex items-center gap-1.5" aria-label={t('banner.position', { current: currentIndex + 1, total: banners.length })} role="navigation">
          {banners.map((banner, index) => (
            <button
              key={banner.src}
              type="button"
              onClick={() => setCurrentIndex(index)}
              aria-label={t('banner.goTo', { number: index + 1 })}
              aria-current={index === currentIndex ? 'true' : undefined}
              className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            >
              <span aria-hidden="true" className={`block h-1.5 rounded-full transition-all ${index === currentIndex ? 'w-5 bg-cyan-100' : 'w-1.5 bg-white/50 hover:bg-white/80'}`} />
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsPaused((paused) => !paused)}
        disabled={prefersReducedMotion}
        aria-label={prefersReducedMotion ? t('banner.reducedMotion') : isPaused ? t('banner.resume') : t('banner.pause')}
        aria-pressed={isPaused}
        className="absolute bottom-2 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPaused ? <Play aria-hidden="true" size={16} /> : <Pause aria-hidden="true" size={16} />}
      </button>
    </div>
  );
}
