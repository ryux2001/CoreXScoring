"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  currentPage: number;
  totalPages: number;
}

export default function Pagination({ currentPage, totalPages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Si solo hay una página, no mostramos nada o devolvemos null según prefieras
  // Pero según tu instrucción, desactivaremos los botones si no hay más de una
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `/catalog?${params.toString()}`;
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    router.push(createPageURL(page));
  };

  if (totalPages <= 0) return null;

  return (
    <div className="mt-16 flex items-center justify-center gap-2 pb-10">
      {/* Botón Anterior */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={isFirstPage}
        className="font-display flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-400 transition-all hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        <ChevronLeft size={16} />
        Anterior
      </button>

      {/* Números de Página */}
      <div className="flex items-center gap-1 mx-4">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`font-display h-9 w-9 rounded-xl text-xs font-semibold transition-all border ${
              currentPage === page
                ? "bg-white text-black border-white"
                : "bg-transparent text-zinc-500 border-transparent hover:border-zinc-800 hover:text-white cursor-pointer"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      {/* Botón Siguiente */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={isLastPage}
        className="font-display flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-400 transition-all hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        Siguiente
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
