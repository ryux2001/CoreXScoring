"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
  };

  const fetchSuggestions = async (value: string) => {
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    const { data } = await supabase
      .from("products")
      .select("name, brand, type")
      .or(`name.ilike.%${value}%,brand.ilike.%${value}%`)
      .limit(5);

    setSuggestions(data || []);
    setShowSuggestions(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchTerm);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* AQUÍ ESTÁ LA MAGIA PARA LA 'X': 
        El form ahora es w-full, dictando el límite exacto para los elementos absolute 
      */}
      <form onSubmit={handleSubmit} className="relative flex items-center w-full">
        <input
          type="text"
          placeholder="Buscar componente..."
          value={searchTerm}
          onFocus={() => searchTerm.length > 1 && setShowSuggestions(true)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            fetchSuggestions(e.target.value);
          }}
          spellCheck={false} // Evita que extensiones como MS Editor rompan la hidratación
          suppressHydrationWarning // Le dice a Next.js que ignore cambios inyectados por extensiones
          className="w-full rounded-xl border border-white/10 bg-zinc-900 py-2.5 pl-10 pr-10 text-sm text-zinc-200 transition-all focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        
        <button 
          type="submit"
          className="absolute left-3 text-zinc-500 hover:text-white transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>

        {searchTerm && (
          <button
            type="button"
            onClick={() => {setSearchTerm(""); setSuggestions([]);}}
            className="absolute right-3 text-zinc-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 shadow-2xl backdrop-blur-xl z-[100]">
          <div className="py-2">
            {suggestions.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  setSearchTerm(item.name);
                  executeSearch(item.name);
                }}
                className="flex w-full flex-col px-4 py-2 text-left transition-colors hover:bg-white/5"
              >
                <span className="text-sm font-medium text-white">{item.name}</span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                  {item.brand} • {item.type}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}