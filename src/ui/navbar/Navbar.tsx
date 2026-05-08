import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import MobileMenu from "./MobileMenu"; 
import AuthStatus from "./AuthStatus";
import SearchBar from "./SearchBar";

const navLinks = [
  { name: "Inicio", href: "/" },
  { name: "Catalogo", href: "/catalog" },
  { name: "Builds", href: "/builds" },
  { name: "Comparador", href: "/comparator" },
  { name: "Boveda", href: "/vault" },
  { name: "Perfil", href: "/profile" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/70 backdrop-blur-md">
      <nav className="mx-auto px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* LADO IZQUIERDO: Título y Buscador */}
          <div className="flex items-center gap-4 flex-1">
            {/* El título desaparece en móvil con 'hidden sm:block' */}
            <Link
              href="/"
              className="hidden sm:block text-xl font-bold tracking-tighter text-white sm:text-2xl whitespace-nowrap"
            >
              CorexScoring
            </Link>

            {/* El buscador ahora es visible siempre y se expande en móvil */}
            <div className="w-full max-w-sm">
              <SearchBar />
            </div>
          </div>

          {/* LADO DERECHO: Acciones */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Links Desktop */}
            <div className="hidden lg:flex lg:items-center lg:gap-3 me-5">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Icono VS (Visible en desktop, puedes decidir si ocultarlo en móvil) */}
            <button className="hidden sm:flex cursor-pointer h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-zinc-900 text-zinc-300 hover:border-white/40 hover:text-white transition-all">
              <ArrowLeftRight className="h-4 w-4" />
            </button>

            {/* AuthStatus Desktop: Se oculta en móvil */}
            <div className="hidden sm:block">
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