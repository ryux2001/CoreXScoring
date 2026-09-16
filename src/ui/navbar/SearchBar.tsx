"use client";

import { Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useRef, useEffect, useId } from "react";
import { useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabaseClient";

interface SearchSuggestion {
  name: string;
  brand: string;
  type: string;
}

interface SearchBarProps {
  autoFocus?: boolean;
  showCloseButton?: boolean;
  onClose?: () => void;
}

export default function SearchBar({
  autoFocus = false,
  showCloseButton = false,
  onClose,
}: SearchBarProps) {
  const t = useTranslations("nav");
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const suggestionsId = useId();

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const executeSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term.trim()) {
      params.set("q", term.trim());
    } else {
      params.delete("q");
    }
    setShowSuggestions(false);
    router.push(`/catalog?${params.toString()}`);
    onClose?.();
  };

  const fetchSuggestions = async (value: string) => {
    const requestId = ++requestIdRef.current;

    try {
      const { data, error } = await supabase
        .from("products")
        .select("name, brand, type")
        .or(`name.ilike.%${value}%,brand.ilike.%${value}%`)
        .limit(5);

      if (requestId !== requestIdRef.current) return;
      if (error) throw error;

      setSuggestions(data || []);
      setShowSuggestions(true);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setSuggestions([]);
      setShowSuggestions(true);
      setSearchError(t("searchError"));
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchTerm);
  };

  const clearSearch = () => {
    setSearchTerm("");
    requestIdRef.current += 1;
    setSuggestions([]);
    setSearchError(null);
    setShowSuggestions(false);
    setIsLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const closeSearch = () => {
    requestIdRef.current += 1;
    setShowSuggestions(false);
    setIsLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onClose?.();
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* AQUÍ ESTÁ LA MAGIA PARA LA 'X': 
        El form ahora es w-full, dictando el límite exacto para los elementos absolute 
      */}
      <form role="search" onSubmit={handleSubmit} className="relative flex w-full items-center">
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={searchTerm}
          role="combobox"
          aria-label={t("searchComponents")}
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={suggestionsId}
          aria-busy={isLoading}
          ref={inputRef}
          onFocus={() => searchTerm.length > 1 && setShowSuggestions(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && onClose) {
              event.preventDefault();
              closeSearch();
            }
          }}
          onChange={(e) => {
            const value = e.target.value;
            setSearchTerm(value);
            setSearchError(null);

            if (debounceRef.current) clearTimeout(debounceRef.current);

            if (value.trim().length < 2) {
              requestIdRef.current += 1;
              setSuggestions([]);
              setShowSuggestions(false);
              setIsLoading(false);
              return;
            }

            setIsLoading(true);
            setShowSuggestions(true);
            debounceRef.current = setTimeout(() => {
              void fetchSuggestions(value.trim());
            }, 250);
          }}
          spellCheck={false} // Evita que extensiones como MS Editor rompan la hidratación
          suppressHydrationWarning // Le dice a Next.js que ignore cambios inyectados por extensiones
          className="font-technical w-full rounded-xl border border-white/10 bg-zinc-900 py-2.5 pl-10 pr-10 text-sm text-zinc-200 transition-all focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
        <button
          type="submit"
          aria-label={t("search")}
          className="absolute left-1 top-1/2 flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <Search className="h-4 w-4" />
        </button>

        {showCloseButton ? (
          <button
            type="button"
            aria-label={t("closeSearch")}
            onClick={closeSearch}
            className="absolute right-1 top-1/2 flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X className="h-4 w-4" />
          </button>
        ) : searchTerm ? (
          <button
            type="button"
            aria-label={t("clearSearch")}
            onClick={clearSearch}
            className="absolute right-1 top-1/2 flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </form>

      <div aria-live="polite" className="sr-only">
        {isLoading ? t("searchingComponents") : searchError || (showSuggestions && suggestions.length === 0 ? t("noResults") : "")}
      </div>

      {showSuggestions && searchTerm.trim().length >= 2 && (
        <div
          id={suggestionsId}
          role="listbox"
          className="absolute top-full z-[100] mt-2 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 shadow-2xl backdrop-blur-xl"
        >
          {isLoading ? (
            <p className="px-4 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {t("searching")}
            </p>
          ) : searchError ? (
            <p className="px-4 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-red-400">
              {searchError}
            </p>
          ) : suggestions.length === 0 ? (
            <p className="px-4 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {t("noResults")}
            </p>
          ) : (
          <div className="py-2">
            {suggestions.map((item) => (
              <button
                key={item.name}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setSearchTerm(item.name);
                  executeSearch(item.name);
                }}
                className="flex min-h-14 w-full flex-col justify-center px-4 py-2 text-left transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
              >
                <span className="font-display text-base font-semibold text-white">{item.name}</span>
                <span className="font-technical text-[10px] uppercase tracking-widest text-zinc-500">
                  {item.brand} • {item.type}
                </span>
              </button>
            ))}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
