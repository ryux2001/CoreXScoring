"use client";

import { User, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/useAuthStore";
import { useState } from "react";
import { useRouter } from "next/navigation";

function getRegisterErrorMessage(error: { status?: number; message?: string }) {
  if (error.status === 400) {
    return "El email o la contraseña no son válidos.";
  }

  if (error.status === 409) {
    return "Este email ya está registrado.";
  }

  return error.message || "No se pudo crear la cuenta. Inténtalo de nuevo.";
}

export default function RegisterForm() {
  const setUser = useAuthStore((state) => state.setUser);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const email = (document.getElementById("reg_email") as HTMLInputElement).value.trim();
    const password = (document.getElementById("reg_pass") as HTMLInputElement).value;
    const name = (document.getElementById("name") as HTMLInputElement).value.trim();

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });

      if (error) {
        setErrorMsg(getRegisterErrorMessage(error));
        return;
      }

      if (!data.session || !data.user) {
        setUser(null);
        setErrorMsg("Cuenta creada. Revisa tu email para confirmar la cuenta antes de iniciar sesión.");
        return;
      }

      setUser(data.user);
      router.push("/");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tighter text-white">Crear una cuenta</h1>

      {errorMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-500 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-4 w-4" />
          <p>{errorMsg}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-400 mb-2">Nombre</label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input id="name" required type="text" placeholder="Juan" className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200" />
          </div>
        </div>
        <div>
          <label htmlFor="reg_email" className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input id="reg_email" required type="email" placeholder="juan@example.com" className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200" />
          </div>
        </div>
        <div>
          <label htmlFor="reg_pass" className="block text-sm font-medium text-zinc-400 mb-2">Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input id="reg_pass" required type="password" placeholder="........" className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200" />
          </div>
        </div>
      </div>

      <button disabled={loading} type="submit" className="cursor-pointer w-full rounded-xl bg-white px-6 py-4 text-lg font-bold text-black hover:bg-zinc-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Registrarse"}
      </button>

      <p className="text-center text-xs text-zinc-500">Al registrarte aceptas nuestros términos de servicio</p>
    </form>
  );
}
