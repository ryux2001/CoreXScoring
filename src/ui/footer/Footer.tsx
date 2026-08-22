import Link from "next/link";
import { Mail } from "lucide-react";

const footerLinks = [
  { name: "Inicio", href: "/" },
  { name: "Tutorial", href: "/" },
  { name: "Sobre nosotros", href: "#" },
  { name: "Preguntas frecuentes", href: "#" },
  { name: "Contáctanos", href: "#" },
  { name: "Política de privacidad", href: "#" },
  { name: "Términos de uso", href: "#" },
  { name: "Política de cookies", href: "#" },
];

const footerLinkColumns = [footerLinks.slice(0, 4), footerLinks.slice(4)];

function XIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 4.5 19.5 19.5M19 4.5 4.5 19.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-zinc-900 bg-zinc-950/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.15fr_0.85fr] md:gap-12 md:py-14 lg:px-0 lg:gap-20">
        <div className="max-w-xs">
          <Link
            href="/"
            className="font-display text-2xl font-bold tracking-tight text-white transition-colors hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            CorexScoring
          </Link>
          <p className="mt-4 font-technical text-sm leading-relaxed text-zinc-500">
            Compara hardware, entiende el rendimiento y elige con criterio.
          </p>
        </div>

        <nav aria-label="Enlaces de información">
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
            Explorar
          </h2>
          <div className="mt-5 grid gap-y-3 md:grid-cols-2 md:gap-x-8 md:gap-y-0">
            {footerLinkColumns.map((links) => (
              <ul key={links[0].name} className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="font-technical text-sm text-zinc-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </nav>

        <div className="flex flex-col justify-between gap-8">
          <div>
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
              Conecta
            </h2>
            <div className="mt-5 flex gap-3">
              <a
                href="#"
                aria-label="Email, próximamente"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <Mail aria-hidden="true" className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="X, próximamente"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <XIcon />
              </a>
            </div>
          </div>

          <p className="font-technical text-xs text-zinc-600">
            © {currentYear} CorexScoring. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
