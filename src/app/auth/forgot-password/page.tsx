import Link from 'next/link';
import ForgotPasswordForm from './ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page font-technical min-h-[calc(100vh-64px)] h-dvh flex items-center justify-center bg-black p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <ForgotPasswordForm />
        <Link
          href="/auth"
          className="mt-6 block text-center text-sm text-zinc-500 transition-colors hover:text-white"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
