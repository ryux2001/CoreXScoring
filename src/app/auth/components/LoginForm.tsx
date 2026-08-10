"use client";

import { AlertCircle, Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getAuthConfirmUrl } from "@/lib/authRedirects";
import { useAuthStore } from "@/store/useAuthStore";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setResendMsg(null);
    setCanResendConfirmation(false);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(getLoginErrorMessage(error));
        setCanResendConfirmation(error.message.toLowerCase().includes("email not confirmed"));
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

  const handleResendConfirmation = async () => {
    setResending(true);
    setResendMsg(null);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: getAuthConfirmUrl("/catalog") },
    });

    setResendMsg(
      error
        ? "No se pudo reenviar el email. Inténtalo de nuevo."
        : "Hemos reenviado el email de confirmación.",
    );
    setResending(false);
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tighter text-white">Bienvenido de nuevo</h1>

      {errorMsg && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{errorMsg}</p>
          </div>
          {canResendConfirmation && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending || !email.trim()}
              className="mt-3 text-left text-xs font-semibold text-white underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resending ? "Reenviando..." : "Reenviar email de confirmación"}
            </button>
          )}
          {resendMsg && <p className="mt-2 text-xs text-zinc-300">{resendMsg}</p>}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-400">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="juan@example.com"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 transition-all focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="pass" className="mb-2 block text-sm font-medium text-zinc-400">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              type="password"
              id="pass"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="........"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 transition-all focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end text-sm">
        <Link href="/auth/forgot-password" className="text-zinc-400 transition-colors hover:text-white">
          Recuperar contraseña
        </Link>
      </div>

      <button
        disabled={loading}
        type="submit"
        className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-white px-6 py-4 text-lg font-bold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Iniciar sesión"}
      </button>
    </form>
  );
}
