import Link from "next/link";
import { Search, ArrowLeftRight } from "lucide-react";
import MobileMenu from "./MobileMenu"; // Importamos el componente de cliente
import AuthStatus from "./AuthStatus";

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
          {/* LADO IZQUIERDO: Título y Buscador (Desktop) */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-xl font-bold tracking-tighter text-white sm:text-2xl"
            >
              CorexScoring
            </Link>

            {/* Buscador Desktop (Boceto 1) */}
            <div className="hidden max-w-sm sm:block">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="search"
                  placeholder="Buscar..."
                  className="lg:w-64 sm:w-75 w-90 rounded-full border border-white/10 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-zinc-200 transition-all focus:border-white/20 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* LADO DERECHO: Acciones */}
          <div className="flex items-center gap-3">

            {/* CENTRO: Links de navegación (Desktop) */}
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

            {/* Icono VS */}
            <button className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-zinc-900 text-zinc-300 hover:border-white/40 hover:text-white transition-all">
              <ArrowLeftRight className="h-4 w-4" />
            </button>

            {/* Botón Principal (Desktop) */}
            <AuthStatus/>

            {/* MENU MÓVIL (Componente de Cliente) */}
            <MobileMenu links={navLinks} />
          </div>
        </div>
      </nav>
    </header>
  );
}
