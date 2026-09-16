"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabaseClient";
import { setLocaleCookie } from "@/i18n/locale-cookie";
import { getValidLocale } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export default function AuthStatus({ isMobile = false }: { isMobile?: boolean }) {
  const t = useTranslations("auth");
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const language = getValidLocale(user?.user_metadata?.language);
    if (!user || user.is_anonymous || !language) return;

    setLocaleCookie(language);
    const visiblePathname = window.location.pathname;
    const hasExplicitSpanishLocale = visiblePathname === "/es" || visiblePathname.startsWith("/es/");
    if (language === "es" && !hasExplicitSpanishLocale) {
      const query = searchParams.toString();
      const hash = window.location.hash;
      router.replace(`${pathname}${query ? `?${query}` : ""}${hash}`, { locale: language, scroll: false });
    }
  }, [pathname, router, searchParams, user]);

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

  if (user?.is_anonymous) {
    return (
      <div className={`flex items-center gap-3 ${isMobile ? "w-full flex-col items-start" : ""}`}>
        <span className="font-display text-sm font-semibold text-zinc-400">{t("guestMode")}</span>
        <Link
          href="/auth"
          className={`font-display rounded-lg text-xs font-bold text-white transition-colors hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
            isMobile ? "min-h-11 w-full border border-white/10 px-3 py-3 hover:bg-white/5" : "px-2"
          }`}
        >
          {t("createAccount")}
        </Link>
      </div>
    );
  }

  if (user) {
    return (
      <div className={`flex items-center gap-4 ${isMobile ? "w-full flex-col items-start gap-3" : ""}`}>
        <span className="font-display text-sm font-semibold text-white">
          {t("greeting", { name: user.user_metadata.full_name || t("defaultUser") })}
        </span>
        <button
          type="button"
          disabled={isSigningOut}
          onClick={async () => {
            setIsSigningOut(true);
            setAuthError(null);

            const { error } = await supabase.auth.signOut();
            if (error) {
              setAuthError(t("signOutError"));
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
          {isSigningOut ? t("signingOut") : t("signOut")}
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
          : "font-display hidden rounded-lg bg-white px-4 py-1.5 text-sm font-bold text-black hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 xl:block"
      } transition-colors cursor-pointer`}
    >
      {t("signIn")}
    </Link>
  );
}
