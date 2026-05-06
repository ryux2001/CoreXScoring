"use client";

import { User, Mail, Lock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/useAuthStore";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const setUser = useAuthStore((state) => state.setUser);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const email = (document.getElementById("reg_email") as HTMLInputElement).value;
    const password = (document.getElementById("reg_pass") as HTMLInputElement).value;
    const name = (document.getElementById("name") as HTMLInputElement).value;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) {
      alert(error.message);
    } else {
      setUser(data.user);
      alert("¡Registro exitoso!");
      router.push("/");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleRegister} className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tighter text-white">Crear una cuenta</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre</label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input id="name" required type="text" placeholder="Juan" className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input id="reg_email" required type="email" placeholder="juan@example.com" className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input id="reg_pass" required type="password" placeholder="........" className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200" />
          </div>
        </div>
      </div>

      <button disabled={loading} type="submit" className="cursor-pointer w-full rounded-xl bg-white px-6 py-4 text-lg font-bold text-black hover:bg-zinc-200">
        {loading ? "Registrando..." : "Registrarse"}
      </button>
      
      <p className="text-center text-xs text-zinc-500">Al registrarte aceptas nuestros términos de servicio</p>
    </form>
  );
}