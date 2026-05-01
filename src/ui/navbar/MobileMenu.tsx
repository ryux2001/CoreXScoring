"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

interface Props {
  links: { name: string; href: string }[];
}

export default function MobileMenu({ links }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative lg:hidden">
      {/* Botón Hamburguesa / Cerrar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer inline-flex items-center justify-center rounded-md p-2 text-zinc-400 hover:text-white"
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
      </button>

      {/* Ventana flotante (Boceto image_963d61.png) */}
      {isOpen && (
        <>
          {/* Fondo invisible para cerrar al hacer click fuera */}
          <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 top-12 w-60 rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            {/* Links verticales */}
            <div className="flex flex-col space-y-5">
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
              
              {/* Botón Autenticarse dentro de la ventana */}
              <button className="mt-4 w-full rounded-xl border border-white/20 bg-transparent py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-colors">
                Autenticarse
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}