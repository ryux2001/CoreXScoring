import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface CategoryAccordionProps {
  title: string;
  itemCount: number;
  children: ReactNode;
  contentClassName?: string;
}

export default function CategoryAccordion({
  title,
  itemCount,
  children,
  contentClassName = 'mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
}: CategoryAccordionProps) {
  return (
    <details open className="group border-b border-zinc-900 pb-8 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-1 py-2 transition-colors hover:bg-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-400 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <ChevronRight
            aria-hidden="true"
            className="size-5 shrink-0 text-zinc-500 transition-transform duration-200 group-open:rotate-90 group-open:text-white"
            strokeWidth={2.5}
          />
          <span className="truncate text-[14px] font-extrabold uppercase tracking-[0.15em] text-zinc-300 group-open:text-white">
            {title}
          </span>
        </span>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          {itemCount} {itemCount === 1 ? 'elemento' : 'elementos'}
        </span>
      </summary>

      <div className={contentClassName}>
        {children}
      </div>
    </details>
  );
}
