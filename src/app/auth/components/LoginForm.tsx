"use client";

import { Mail, Lock } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const setUser = useAuthStore((state) => state.setUser);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (document.getElementById("email") as HTMLInputElement).value;
    const password = (document.getElementById("pass") as HTMLInputElement).value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      setUser(data.user);
      router.push("/"); // Redirigir al inicio tras login
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tighter text-white">Bienvenido de nuevo</h1>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              type="email"
              id="email"
              required
              placeholder="juan@example.com"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="pass" className="block text-sm font-medium text-zinc-400 mb-2">Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              type="password"
              id="pass"
              required
              placeholder="........"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" className="h-5 w-5 rounded border-white/20 bg-zinc-900 appearance-none checked:bg-white" />
          <span className="text-zinc-400">Recordarme</span>
        </label>
        <Link href="#" className="text-zinc-400 hover:text-white transition-colors">recuperar contraseña</Link>
      </div>

      <div className="space-y-3">
        <button type="submit" className="cursor-pointer w-full rounded-xl bg-white px-6 py-4 text-lg font-bold text-black hover:bg-zinc-200 transition-colors">
          Iniciar Sesion
        </button>
        <button type="button" className="cursor-pointer flex items-center justify-center gap-3.5 w-full rounded-xl border border-white/10 bg-zinc-900 px-6 py-4 text-lg font-bold text-white hover:bg-zinc-800 transition-colors">
          <span>Iniciar con Google</span>
        </button>
      </div>
    </form>
  );
}