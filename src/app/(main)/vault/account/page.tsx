import Link from 'next/link';
import { redirect } from 'next/navigation';
import PasswordChangeForm from '@/app/auth/components/PasswordChangeForm';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export default async function VaultAccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const fullName = user.user_metadata.full_name || 'Usuario';

  return (
    <main className="min-h-screen bg-black p-6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-zinc-800 bg-zinc-950/40 p-5 shadow-2xl md:p-8">
        <Link
          href="/vault"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white"
        >
          Volver a la bóveda
        </Link>

        <header className="mt-6 border-b border-zinc-800 pb-6">
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">
            Cuenta
          </span>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
            Gestionar cuenta
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Administra tu acceso a CorexScoring.
          </p>
        </header>

        <section className="border-b border-zinc-800 py-6">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            Datos de acceso
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Nombre</p>
              <p className="mt-2 text-sm font-medium text-zinc-200">{fullName}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Email</p>
              <p className="mt-2 break-all text-sm font-medium text-zinc-200">{user.email}</p>
            </div>
          </div>
        </section>

        <section className="pt-6">
          <h2 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            Cambiar contraseña
          </h2>
          <p className="mb-5 text-sm text-zinc-500">
            Confirma tu contraseña actual antes de establecer una nueva.
          </p>
          <PasswordChangeForm requireCurrentPassword />
        </section>
      </div>
    </main>
  );
}
