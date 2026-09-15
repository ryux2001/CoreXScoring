'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ComboMainCard from './ComboMainCard';

interface MobileComboIslandProps {
  combo: {
    title: string;
    category?: string;
    [key: string]: unknown;
  };
  currency?: string;
}

export default function MobileComboIsland({
  combo,
  currency = 'USD',
}: MobileComboIslandProps) {
  const [isOpen, setIsOpen] = useState(false);
  const generatedId = useId();
  const panelId = `mobile-combo-details-${generatedId.replace(/:/g, '')}`;

  return (
    <section className="w-full">
      <div
        className={`overflow-hidden border border-zinc-900 bg-zinc-950/40 shadow-2xl backdrop-blur-sm ${
          isOpen ? 'rounded-t-3xl border-b-0' : 'rounded-3xl'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label={`${isOpen ? 'Ocultar' : 'Mostrar'} información de ${combo.title}`}
          className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors active:bg-zinc-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-inset"
        >
          <span className="flex min-w-0 items-center">
            <span className="min-w-0">
              {isOpen && (
                <span className="block truncate text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  {combo.category}
                </span>
              )}
              <span className="block truncate text-sm font-black leading-snug tracking-tight text-white">
                {combo.title}
              </span>
            </span>
          </span>
          <ChevronDown
            size={20}
            aria-hidden="true"
            className={`shrink-0 text-zinc-400 transition-transform duration-300 ${
              isOpen ? 'rotate-180 text-white' : ''
            }`}
          />
        </button>
      </div>

      <div
        id={panelId}
        role="region"
        aria-label={`Componentes de ${combo.title}`}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <ComboMainCard
            combo={combo}
            currency={currency}
            showHeader={false}
            className="rounded-t-none border-t-0 shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}
