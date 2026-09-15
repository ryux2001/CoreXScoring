import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from '@/i18n/server-navigation';
import { resolveRequestCurrency } from '@/lib/serverCurrency';
import CreatedBuildWorkspace from '../components/CreatedBuildWorkspace';

interface NewCreatedBuildPageProps {
  searchParams: Promise<{ currency?: string }>;
}

async function createVaultClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { storageKey: 'sb-auth-token' },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot always write response cookies.
          }
        },
      },
    },
  );
}

export default async function NewCreatedBuildPage({ searchParams }: NewCreatedBuildPageProps) {
  const params = await searchParams;
  const currency = await resolveRequestCurrency(params.currency);
  const supabase = await createVaultClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    await redirect('/auth');
    return null;
  }

  const { data: games } = await supabase.from('games').select('*');
  return <CreatedBuildWorkspace games={games || []} currency={currency} />;
}
