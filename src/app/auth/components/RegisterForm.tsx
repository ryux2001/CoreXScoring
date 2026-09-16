"use client";

import { AlertCircle, CheckCircle2, Loader2, Lock, Mail, User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabaseClient";
import { getAuthConfirmUrl } from "@/lib/authRedirects";
import { useAuthStore } from "@/store/useAuthStore";

export default function RegisterForm() {
  const t = useTranslations("auth");
  const setUser = useAuthStore((state) => state.setUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const router = useRouter();

  const getRegisterErrorMessage = (error: { status?: number; message?: string }) => {
    if (error.status === 400) return t("invalidEmailOrPassword");
    if (error.status === 409) return t("emailAlreadyRegistered");

    return error.message || t("createAccountError");
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    setConfirmationEmail(null);
    setResendMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg(t("passwordsDoNotMatch"));
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: getAuthConfirmUrl("/catalog"),
        },
      });

      if (error) {
        setErrorMsg(getRegisterErrorMessage(error));
        return;
      }

      if (!data.session || !data.user) {
        setUser(null);
        setConfirmationEmail(normalizedEmail);
        return;
      }

      setUser(data.user);
      router.push("/");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : t("createAccountError"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!confirmationEmail) return;

    setResending(true);
    setResendMsg(null);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: confirmationEmail,
      options: { emailRedirectTo: getAuthConfirmUrl("/catalog") },
    });

    setResendMsg(
      error
        ? t("resendConfirmationError")
        : t("confirmationEmailResent"),
    );
    setResending(false);
  };

  return (
    <form onSubmit={handleRegister} className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tighter text-white">{t("createAccount")}</h1>

      {errorMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {confirmationEmail && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {t.rich("checkEmailToConfirmAccount", {
                email: confirmationEmail,
                strong: (chunks) => <span className="font-semibold">{chunks}</span>,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resending}
            className="mt-3 text-xs font-semibold text-white underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending ? t("resending") : t("resendConfirmationEmail")}
          </button>
          {resendMsg && <p className="mt-2 text-xs text-zinc-300">{resendMsg}</p>}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-zinc-400">
            {t("name")}
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              id="name"
              required
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("namePlaceholder")}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg_email" className="mb-2 block text-sm font-medium text-zinc-400">
            {t("email")}
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              id="reg_email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("emailPlaceholder")}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg_pass" className="mb-2 block text-sm font-medium text-zinc-400">
            {t("password")}
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              id="reg_pass"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("passwordPlaceholder")}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg_confirm_pass" className="mb-2 block text-sm font-medium text-zinc-400">
            {t("confirmPassword")}
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              id="reg_confirm_pass"
              required
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t("passwordPlaceholder")}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>
      </div>

      <button
        disabled={loading}
        type="submit"
        className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-white px-6 py-4 text-lg font-bold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : t("register")}
      </button>

      <p className="text-center text-xs leading-relaxed text-zinc-500">
        {t.rich("registrationTermsNotice", {
          terms: (chunks) => <Link href="/terms" className="text-zinc-300 underline underline-offset-4 hover:text-white">{chunks}</Link>,
          privacy: (chunks) => <Link href="/privacy" className="text-zinc-300 underline underline-offset-4 hover:text-white">{chunks}</Link>,
        })}
      </p>
    </form>
  );
}
