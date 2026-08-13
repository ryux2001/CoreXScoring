"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  const isActiveLink = (href: string) =>
    href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/70 backdrop-blur-md">
      <nav aria-label="Navegación principal" className="mx-auto px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* LADO IZQUIERDO: Título y Buscador */}
          <div className="flex min-w-0 flex-1 items-center gap-4">
            {/* El título desaparece en móvil con 'hidden sm:block' */}
            <Link
              href="/"
              className="hidden sm:block text-xl font-bold tracking-tighter text-white sm:text-2xl whitespace-nowrap"
            >
              CorexScoring
            </Link>

            {/* El buscador ahora es visible siempre y se expande en móvil */}
            <div className="min-w-0 w-full max-w-sm flex-1">
              <SearchBar />
            </div>
          </div>

          {/* LADO DERECHO: Acciones */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Links Desktop */}
            <div className="hidden lg:flex lg:items-center lg:gap-3 me-5">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  aria-current={isActiveLink(link.href) ? "page" : undefined}
                  className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                    isActiveLink(link.href)
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Icono VS (Visible en desktop, puedes decidir si ocultarlo en móvil) */}
            <CompareCartDropdown />

            {/* AuthStatus Desktop: Se oculta en móvil */}
            <div className="hidden lg:block">
              <AuthStatus />
            </div>

            {/* Menú Móvil: Siempre presente en móvil */}
            <MobileMenu links={navLinks} />
          </div>
        </div>
      </nav>
    </header>
  );
}
