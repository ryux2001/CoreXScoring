import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import CreatedComboWorkspace from '../components/CreatedComboWorkspace';

interface CreatedComboDetailPageProps {
  params: Promise<{ slug: string }>;
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
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write response cookies.
          }
        },
      },
    },
  );
}

export default async function CreatedComboDetailPage({
  params,
  searchParams,
}: CreatedComboDetailPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const currency = query.currency === 'EUR' ? 'EUR' : 'USD';
  const supabase = await createVaultClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth');

  const [{ data: combo, error }, { data: games }] = await Promise.all([
    supabase
      .from('created_combos')
      .select(`
        *,
        cpu:products!cpu_id(*),
        gpu:products!gpu_id(*),
        ram:products!ram_id(*)
      `)
      .eq('user_id', user.id)
      .eq('slug', slug)
      .maybeSingle(),
    supabase.from('games').select('*'),
  ]);

  if (error || !combo) notFound();

  return (
    <CreatedComboWorkspace
      initialCombo={combo}
      games={games || []}
      currency={currency}
    />
  );
}
