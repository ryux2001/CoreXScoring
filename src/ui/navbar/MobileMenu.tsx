"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthStatus from "./AuthStatus"; // Importamos AuthStatus

interface Props {
  links: { name: string; href: string }[];
}

export default function MobileMenu({ links }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  const isActiveLink = (href: string) =>
    href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    if (!isOpen) return;

    firstLinkRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const closeMenu = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className="relative z-50 lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {isOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
      </button>

      {isOpen && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closeMenu}
          />
          <nav
            id="mobile-navigation"
            aria-label="Navegación móvil"
            className="absolute right-0 top-14 z-50 w-64 rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Links de navegación */}
            <div className="flex flex-col space-y-5 border-b border-white/5 pb-6">
              {links.map((link, index) => (
                <Link
                  key={link.name}
                  href={link.href}
                  ref={index === 0 ? firstLinkRef : undefined}
                  onClick={closeMenu}
                  aria-current={isActiveLink(link.href) ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                    isActiveLink(link.href)
                      ? "bg-white/10 text-white"
                      : "text-zinc-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            
            {/* Estado de Autenticación dentro del menú */}
            <div className="mt-6">
              <AuthStatus isMobile={true} />
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
