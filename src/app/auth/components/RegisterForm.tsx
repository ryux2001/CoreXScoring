import { User, Mail, Lock } from "lucide-react";

export default function RegisterForm() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tighter text-white">Crear una cuenta</h1>

      {/* Inputs (Estilo como image_9.png, apilados) */}
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-400 mb-2">
            Nombre
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              type="text"
              id="name"
              placeholder="Juan"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 placeholder-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg_email" className="block text-sm font-medium text-zinc-400 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              type="email"
              id="reg_email"
              placeholder="juan@example.com"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 placeholder-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg_pass" className="block text-sm font-medium text-zinc-400 mb-2">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              type="password"
              id="reg_pass"
              placeholder="........"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 placeholder-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg_pass_conf" className="block text-sm font-medium text-zinc-400 mb-2">
            Confirmar Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              type="password"
              id="reg_pass_conf"
              placeholder="........"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 placeholder-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Botones (Corregido texto para Registro) */}
      <div className="space-y-3 pt-3">
        <button className="w-full rounded-xl bg-white px-6 py-4 text-lg font-bold text-black hover:bg-zinc-200 transition-colors">
          Registrarse
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
          Registrarse con Google
        </button>
      </div>

      {/* Texto Legal al final (como en image_9.png) */}
      <p className="text-center text-sm text-zinc-400 px-4">
        Al registrarte aceptas nuestros terminos de servicios y politicas de privacidad
      </p>
    </div>
  );
}