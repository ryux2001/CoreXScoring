"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useRef, useState } from "react";
import MobileMenu from "./MobileMenu";
import AuthStatus from "./AuthStatus";
import SearchBar from "./SearchBar";

import CompareCartDropdown from "./CompareCartDropdown";

const navLinks = [
  { name: "Inicio", href: "/" },
  { name: "Catálogo", href: "/catalog" },
  { name: "Combos", href: "/combos" },
  { name: "Builds", href: "/builds" },
  { name: "Comparador", href: "/comparator" },
  { name: "Bóveda", href: "/vault" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  const isActiveLink = (href: string) =>
    href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const closeMobileSearch = () => {
    setIsMobileSearchOpen(false);
    window.requestAnimationFrame(() => searchButtonRef.current?.focus());
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/70 backdrop-blur-md">
      <nav aria-label="Navegación principal" className="relative mx-auto px-4 py-1.5 sm:px-6 sm:py-2 xl:px-8">
        <div className="flex h-14 items-center justify-between gap-2 xl:hidden">
          <Link
            href="/"
            className="font-display min-w-0 truncate whitespace-nowrap text-xl font-bold tracking-tight text-white"
          >
            CorexScoring
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            {!isMobileSearchOpen && (
              <button
                ref={searchButtonRef}
                type="button"
                onClick={() => setIsMobileSearchOpen(true)}
                aria-label="Abrir búsqueda"
                aria-expanded={false}
                aria-controls="mobile-search"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <Search className="h-5 w-5" />
              </button>
            )}

            <CompareCartDropdown onOpen={() => setIsMobileSearchOpen(false)} />
            <MobileMenu links={navLinks} onOpen={() => setIsMobileSearchOpen(false)} />
          </div>
        </div>

        {isMobileSearchOpen && (
          <div id="mobile-search" className="absolute inset-x-4 top-full z-50 mt-2 xl:hidden">
            <SearchBar autoFocus showCloseButton onClose={closeMobileSearch} />
          </div>
        )}

        <div className="hidden h-16 items-center justify-between gap-4 xl:flex">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Link
              href="/"
              className="font-display whitespace-nowrap text-xl font-bold tracking-tight text-white xl:text-2xl"
            >
              CorexScoring
            </Link>

            <div className="min-w-0 w-full max-w-sm flex-1">
              <SearchBar />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 xl:gap-3">
            <div className="hidden me-5 xl:flex xl:items-center xl:gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  aria-current={isActiveLink(link.href) ? "page" : undefined}
                  className={`font-display rounded-lg px-2 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                    isActiveLink(link.href)
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <CompareCartDropdown />

            <div className="hidden xl:block">
              <AuthStatus />
            </div>

            <MobileMenu links={navLinks} />
          </div>
        </div>
      </nav>
    </header>
  );
}
