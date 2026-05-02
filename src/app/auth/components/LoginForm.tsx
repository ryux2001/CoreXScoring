import { Mail, Lock, KeyRound } from "lucide-react";
import Link from "next/link";

export default function LoginForm() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tighter text-white">Bienvenido de nuevo</h1>

      {/* Inputs (Estilo como image_8.png) */}
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              type="email"
              id="email"
              placeholder="juan@example.com"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 placeholder-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="pass" className="block text-sm font-medium text-zinc-400 mb-2">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              type="password"
              id="pass"
              placeholder="........"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 placeholder-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Checkbox y Link */}
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            className="h-5 w-5 rounded-md border border-white/20 bg-zinc-900 checked:bg-white checked:border-white transition-all appearance-none"
          />
          <span className="text-zinc-200 group-hover:text-white transition-colors">Recordarme</span>
        </label>
        <Link href="#" className="text-zinc-400 hover:text-white transition-colors">
          recuperar contraseña
        </Link>
      </div>

      {/* Botones */}
      <div className="space-y-3 pt-3">
        <button className="w-full rounded-xl bg-white px-6 py-4 mb-5 text-lg font-bold text-black hover:bg-zinc-200 transition-colors">
          Iniciar Sesion
        </button>
        <button className="flex items-center justify-center gap-3.5 w-full rounded-xl border border-white/10 bg-zinc-900 px-6 py-4 text-lg font-bold text-white hover:bg-zinc-800 transition-colors">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.96 3.4-2.16 4.44-1.2 1.04-2.88 1.6-4.68 1.6-3.88 0-7-3.12-7-7s3.12-7 7-7c1.72 0 3.28.6 4.56 1.72l2.64-2.64c-1.92-1.84-4.52-3-7.2-3-6.16 0-11 4.84-11 11s4.84 11 11 11c3.48 0 6.32-1.12 8.4-3.2 2.16-2.08 3.08-5.16 3.08-8.12 0-.6-.04-1.12-.12-1.64h-10.24z"></path>
          </svg>
          Iniciar con Google
        </button>
      </div>
    </div>
  );
}