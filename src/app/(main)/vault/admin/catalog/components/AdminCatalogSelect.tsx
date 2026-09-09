'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

interface AdminCatalogSelectOption {
  value: string;
  label: string;
}

export default function AdminCatalogSelect({
  label,
  value,
  options,
  onChange,
  showLabel = false,
}: {
  label: string;
  value: string;
  options: AdminCatalogSelectOption[];
  onChange: (value: string) => void;
  showLabel?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)));
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    menuRef.current?.focus();
  }, [isOpen]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  const moveActive = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + options.length) % options.length);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
      setIsOpen(true);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(0, options.length - 1));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (options[activeIndex]) choose(options[activeIndex].value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative min-w-0">
      {showLabel && <span className="mb-2 block text-xs font-bold text-zinc-300">{label}</span>}
      {!showLabel && <span className="sr-only">{label}</span>}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-black px-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${isOpen ? 'border-cyan-200/70 shadow-[0_0_0_1px_rgba(165,243,252,0.15)]' : 'border-zinc-800 hover:border-zinc-600'}`}
      >
        <span className={`truncate text-xs ${selectedOption?.value === value ? 'text-zinc-200' : 'text-zinc-600'}`}>
          {selectedOption?.label ?? 'Seleccionar'}
        </span>
        <ChevronDown aria-hidden="true" size={15} className={`shrink-0 text-zinc-500 transition-transform ${isOpen ? 'rotate-180 text-cyan-200' : ''}`} />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          ref={menuRef}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 max-h-64 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.5)] outline-none"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            const optionTone = isActive
              ? 'bg-cyan-200 text-black'
              : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200';
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option.value)}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-xs transition-colors ${optionTone} ${isSelected ? 'font-bold' : ''}`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check aria-hidden="true" size={15} className={`shrink-0 ${isActive ? 'text-cyan-950' : 'text-cyan-200'}`} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
