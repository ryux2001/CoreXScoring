'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface ComboPaginationProps {
  basePath: string;
  currentPage: number;
  totalPages: number;
}

export default function ComboPagination({
  basePath,
  currentPage,
  totalPages,
}: ComboPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Paginación">
      <button
        type="button"
        onClick={() => router.push(createPageUrl(currentPage - 1))}
        disabled={currentPage <= 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="px-3 text-xs font-bold text-zinc-500">
        {currentPage} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => router.push(createPageUrl(currentPage + 1))}
        disabled={currentPage >= totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Página siguiente"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
