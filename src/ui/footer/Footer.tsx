import Link from "next/link";

const footerLinks = [
  { name: "Inicio", href: "/" },
  { name: "Tutorial", href: "/" },
  { name: "Sobre nosotros", href: "#" },
  { name: "Preguntas frecuentes", href: "#" },
  { name: "Soporte técnico", href: "#" },
  { name: "Política de privacidad", href: "/privacy" },
  { name: "Términos de uso", href: "/terms" },
  { name: "Política de cookies", href: "/cookies" },
];

const footerLinkColumns = [footerLinks.slice(0, 4), footerLinks.slice(4), ];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-zinc-900 bg-zinc-950/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.25fr_0.75fr] md:gap-12 md:py-14 lg:px-4 lg:gap-12">
        
        
        
        {/* Parte izquierda */}
        
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
        
        
        
        {/* Parte media */}
        
        <nav aria-label="Enlaces de información">
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
            Explorar
          </h2>
          <div className="mt-5 grid gap-y-3 md:grid-cols-2 lg:grid-cols-2 md:gap-x-8 md:gap-y-0">
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
            
            
            
        {/* Parte derecha */}
        
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
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M4 7.00005L10.2 11.65C11.2667 12.45 12.7333 12.45 13.8 11.65L20 7" stroke="#52525c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> <rect x="3" y="5" width="18" height="14" rx="2" stroke="#52525c" strokeWidth="2" strokeLinecap="round"></rect> </g></svg>
              </a>
              <a
                href="#"
                aria-label="X, próximamente"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 256 256"
                  width="256"
                  height="256"
                  aria-hidden="true"
                  className="w-7 h-7"
                >
                  <g
                    style={{
                      stroke: "none",
                      strokeWidth: 0,
                      strokeDasharray: "none",
                      strokeLinecap: "butt",
                      strokeLinejoin: "miter",
                      strokeMiterlimit: 10,
                      fill: "none",
                      fillRule: "nonzero",
                      opacity: 1,
                    }}
                    transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)"
                  >
                    <path
                      d="M 0.219 2.882 l 34.748 46.461 L 0 87.118 h 7.87 l 30.614 -33.073 l 24.735 33.073 H 90 L 53.297 38.043 L 85.844 2.882 h -7.87 L 49.781 33.341 L 27.001 2.882 H 0.219 z M 11.793 8.679 h 12.303 L 78.425 81.32 H 66.122 L 11.793 8.679 z"
                      style={{
                        stroke: "none",
                        strokeWidth: 1,
                        strokeDasharray: "none",
                        strokeLinecap: "butt",
                        strokeLinejoin: "miter",
                        strokeMiterlimit: 10,
                        fill: "#52525c",
                        fillRule: "nonzero",
                        opacity: 1,
                      }}
                      transform="matrix(1 0 0 1 0 0)"
                      strokeLinecap="round"
                    />
                  </g>
                </svg>
              </a>
              <a
                href="#"
                aria-label="TikTok, próximamente"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7.5 w-7.5"
                  aria-hidden="true"
                >
                  <path
                    d="M16.8217 5.1344C16.0886 4.29394 15.6479 3.19805 15.6479 2H14.7293M16.8217 5.1344C17.4898 5.90063 18.3944 6.45788 19.4245 6.67608C19.7446 6.74574 20.0786 6.78293 20.4266 6.78293V10.2191C18.645 10.2191 16.9932 9.64801 15.6477 8.68211V15.6707C15.6477 19.1627 12.8082 22 9.32386 22C7.50043 22 5.85334 21.2198 4.69806 19.98C3.64486 18.847 2.99994 17.3331 2.99994 15.6707C2.99994 12.2298 5.75592 9.42509 9.17073 9.35079M16.8217 5.1344C16.8039 5.12276 16.7861 5.11101 16.7684 5.09914M6.9855 17.3517C6.64217 16.8781 6.43802 16.2977 6.43802 15.6661C6.43802 14.0734 7.73249 12.7778 9.32394 12.7778C9.62087 12.7778 9.9085 12.8288 10.1776 12.9124V9.40192C9.89921 9.36473 9.61622 9.34149 9.32394 9.34149C9.27287 9.34149 8.86177 9.36884 8.81073 9.36884M14.7244 2H12.2097L12.2051 15.7775C12.1494 17.3192 10.8781 18.5591 9.32386 18.5591C8.35878 18.5591 7.50971 18.0808 6.98079 17.3564"
                    stroke="#52525c"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                  />
                </svg>
              </a>
              <a
                href="#"
                aria-label="YouTube, próximamente"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <svg
                  viewBox="0 -0.5 25 25"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-9 w-9"
                  aria-hidden="true"
            
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M18.168 19.0028C20.4724 19.0867 22.41 17.29 22.5 14.9858V9.01982C22.41 6.71569 20.4724 4.91893 18.168 5.00282H6.832C4.52763 4.91893 2.58998 6.71569 2.5 9.01982V14.9858C2.58998 17.29 4.52763 19.0867 6.832 19.0028H18.168Z"
                    stroke="#52525c"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12.008 9.17784L15.169 11.3258C15.3738 11.4454 15.4997 11.6647 15.4997 11.9018C15.4997 12.139 15.3738 12.3583 15.169 12.4778L12.008 14.8278C11.408 15.2348 10.5 14.8878 10.5 14.2518V9.75184C10.5 9.11884 11.409 8.77084 12.008 9.17784Z"
                    stroke="#52525c"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
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
