"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthStatus({ isMobile = false }: { isMobile?: boolean }) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setUser]);

  if (user) {
    return (
      <div className={`flex items-center gap-4 ${isMobile ? "w-full flex-col items-start gap-3" : ""}`}>
        <span className="font-display text-sm font-semibold text-white">
          Hola, {user.user_metadata.full_name || "Usuario"}
        </span>
        <button
          type="button"
          disabled={isSigningOut}
          onClick={async () => {
            setIsSigningOut(true);
            setAuthError(null);

            const { error } = await supabase.auth.signOut();
            if (error) {
              setAuthError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
              setIsSigningOut(false);
              return;
            }

            logout();
            router.replace("/");
            router.refresh();
          }}
          className={`font-display min-h-11 rounded-lg text-xs font-semibold text-zinc-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-wait disabled:opacity-60 ${
            isMobile ? "w-full border border-white/10 px-3 text-left hover:bg-white/5" : "px-2"
          }`}
        >
          {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>
        {authError && (
          <p role="alert" className="text-[10px] text-red-400">
            {authError}
          </p>
        )}
      </div>
    );
  }

  return (
    <Link
      href="/auth"
      className={`${
        isMobile
          ? "font-display flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-3 text-center text-sm font-bold text-zinc-950 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          : "font-display hidden rounded-lg bg-white px-4 py-1.5 text-sm font-bold text-black hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 lg:block"
      } transition-colors cursor-pointer`}
    >
      Iniciar sesión
    </Link>
  );
}
