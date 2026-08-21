import { redirect } from 'next/navigation';
import PasswordChangeForm from '@/app/auth/components/PasswordChangeForm';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export default async function UpdatePasswordPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  return (
    <main className="auth-page font-technical min-h-[calc(100vh-64px)] h-dvh flex items-center justify-center bg-black p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-8 shadow-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tighter text-white">
            Nueva contraseña
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            Elige una nueva contraseña para recuperar el acceso a tu cuenta.
          </p>
        </div>
        <PasswordChangeForm successRedirect="/catalog" />
      </div>
    </main>
  );
}
