"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import AuthStatus from "./AuthStatus"; // Importamos AuthStatus

interface Props {
  links: { name: string; href: string }[];
}

export default function MobileMenu({ links }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative lg:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer inline-flex items-center justify-center rounded-md p-2 text-zinc-400 hover:text-white"
      >
        {isOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 top-12 w-64 rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            {/* Links de navegación */}
            <div className="flex flex-col space-y-5 border-b border-white/5 pb-6">
              {links.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-medium text-zinc-300 transition-colors hover:text-white"
                >
                  {link.name}
                </Link>
              ))}
            </div>
            
            {/* Estado de Autenticación dentro del menú */}
            <div className="mt-6">
              <AuthStatus isMobile={true} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}