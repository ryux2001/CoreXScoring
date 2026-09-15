"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";

interface Props {
  currentPage: number;
  totalPages: number;
}

type PageItem = number | "ellipsis";

function getPageItems(currentPage: number, totalPages: number, isMobile: boolean): PageItem[] {
  if (isMobile) {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 2) return [1, 2, 3, "ellipsis", totalPages];
    if (currentPage >= totalPages - 1) {
      return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "ellipsis", currentPage, "ellipsis", totalPages];
  }

  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, "ellipsis", totalPages];
  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
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
    <nav
      className="mt-16 flex flex-wrap items-center justify-center gap-1 px-1 pb-10 sm:gap-2"
      aria-label="Paginación del catálogo"
    >
      <button
        type="button"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={isFirstPage}
        aria-label="Página anterior"
        className="font-display flex h-10 w-10 shrink-0 items-center justify-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-semibold text-zinc-400 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
      >
        <ChevronLeft size={16} />
        <span className="hidden sm:inline">Anterior</span>
      </button>

      <div className="flex items-center gap-0 sm:mx-4 sm:gap-1">
        <div className="flex items-center gap-0 sm:hidden">
          {getPageItems(currentPage, totalPages, true).map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`mobile-ellipsis-${index}`}
                className="flex h-10 w-5 items-center justify-center text-xs text-zinc-600"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={`mobile-page-${item}`}
                type="button"
                onClick={() => handlePageChange(item)}
                aria-current={currentPage === item ? "page" : undefined}
                aria-label={`Ir a la página ${item}`}
                className={`font-display h-10 w-10 shrink-0 rounded-xl border text-xs font-semibold transition-all ${
                  currentPage === item
                    ? "border-white bg-white text-black"
                    : "border-transparent bg-transparent text-zinc-500 hover:border-zinc-800 hover:text-white"
                }`}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          {getPageItems(currentPage, totalPages, false).map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`desktop-ellipsis-${index}`}
                className="flex h-9 w-5 items-center justify-center text-xs text-zinc-600"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={`desktop-page-${item}`}
                type="button"
                onClick={() => handlePageChange(item)}
                aria-current={currentPage === item ? "page" : undefined}
                aria-label={`Ir a la página ${item}`}
                className={`font-display h-9 w-9 rounded-xl border text-xs font-semibold transition-all ${
                  currentPage === item
                    ? "border-white bg-white text-black"
                    : "border-transparent bg-transparent text-zinc-500 hover:border-zinc-800 hover:text-white"
                }`}
              >
                {item}
              </button>
            ),
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={isLastPage}
        aria-label="Página siguiente"
        className="font-display flex h-10 w-10 shrink-0 items-center justify-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-semibold text-zinc-400 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
      >
        <span className="hidden sm:inline">Siguiente</span>
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
