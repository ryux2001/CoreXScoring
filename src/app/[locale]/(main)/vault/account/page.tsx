import { Link } from '@/i18n/navigation';
import { redirect } from '@/i18n/server-navigation';
import DeleteAccountForm from '@/app/auth/components/DeleteAccountForm';
import NameChangeForm from '@/app/auth/components/NameChangeForm';
import AiChatProvidersCard from '@/app/auth/components/AiChatProvidersCard';
import GoogleIdentityCard from '@/app/auth/components/GoogleIdentityCard';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export default async function VaultAccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await redirect('/auth');
    return null;
  }

  const fullName = user.user_metadata.full_name || 'Usuario';
  const hasGoogleIdentity = user.identities?.some((identity) => identity.provider === 'google') ?? false;

  return (
    <main className="vault-page font-technical min-h-screen bg-black p-3.5 sm:p-6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-3xl rounded-[1rem] border border-zinc-900 bg-zinc-950/40 p-5 shadow-2xl md:p-8">
        <Link
          href="/vault"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white"
        >
          Volver a la bóveda
        </Link>

        <header className="mt-6 border-b border-zinc-800 pb-6">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
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
          <h2 className="text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
            Datos de acceso
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <NameChangeForm initialName={fullName} />
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Email</p>
              <p className="mt-2 break-all text-sm font-medium text-zinc-200">{user.email}</p>
            </div>
          </div>
        </section>

        <GoogleIdentityCard connected={hasGoogleIdentity} />

        <AiChatProvidersCard />

        <section className="mt-8 border-t border-zinc-800 pt-6">
          <h2 className="text-[14px] font-extrabold uppercase tracking-[0.2em] text-red-400">
            Zona peligrosa
          </h2>
          <p className="mb-5 mt-2 text-sm text-zinc-500">
            Eliminar tu cuenta borra tu acceso y tus datos personales de autenticación.
          </p>
          <DeleteAccountForm googleConnected={hasGoogleIdentity} />
        </section>
      </div>
    </main>
  );
}
