"use client";

import { Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

function getLoginErrorMessage(error: { status?: number; message?: string }) {
  const message = error.message?.toLowerCase() || "";

  if (message.includes("email not confirmed")) {
    return "Confirma tu email antes de iniciar sesión.";
  }

  if (error.status === 400) {
    return "Credenciales inválidas. Revisa tu email o contraseña.";
  }

  return error.message || "No se pudo iniciar sesión. Inténtalo de nuevo.";
}

export default function LoginForm() {
  const setUser = useAuthStore((state) => state.setUser);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const email = (document.getElementById("email") as HTMLInputElement).value.trim();
    const password = (document.getElementById("pass") as HTMLInputElement).value;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(getLoginErrorMessage(error));
        return;
      }

      if (!data.session || !data.user) {
        setErrorMsg("No se pudo crear una sesión válida. Inténtalo de nuevo.");
        return;
      }

      setUser(data.user);
      router.push("/catalog");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tighter text-white">Bienvenido de nuevo</h1>

      {errorMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-500 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-4 w-4" />
          <p>{errorMsg}</p>
        </div>
      )}

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
        <button
          disabled={loading}
          type="submit"
          className="cursor-pointer w-full rounded-xl bg-white px-6 py-4 text-lg font-bold text-black hover:bg-zinc-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Iniciar Sesión"}
        </button>
      </div>
    </form>
  );
}
