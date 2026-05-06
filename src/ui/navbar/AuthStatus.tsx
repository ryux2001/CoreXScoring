"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabaseClient";
import { useEffect } from "react";

export default function AuthStatus({ isMobile = false }: { isMobile?: boolean }) {
  const { user, setUser, logout } = useAuthStore();

  // Persistir sesión al recargar la página
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, [setUser]);

  if (user) {
    return (
      <div className={`flex items-center gap-4 ${isMobile ? "flex-col w-full" : ""}`}>
        <span className="text-sm font-medium text-white">
          Hola, {user.user_metadata.full_name || "Usuario"}
        </span>
        <button 
          onClick={async () => {
            await supabase.auth.signOut();
            logout();
          }}
          className="text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <Link 
      href="/auth" 
      className={`${
        isMobile 
        ? "mt-4 w-full rounded-xl border border-white/20 bg-transparent py-3 text-center text-sm font-bold text-white hover:bg-zinc-800" 
        : "hidden lg:block rounded-lg bg-white px-4 py-1.5 text-sm font-bold text-black hover:bg-zinc-200"
      } transition-colors cursor-pointer`}
    >
      Autenticarse
    </Link>
  );
}