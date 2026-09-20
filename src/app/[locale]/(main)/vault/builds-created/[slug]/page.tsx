import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { redirect } from '@/i18n/server-navigation';
import { resolveRequestCurrency } from '@/lib/serverCurrency';
import CreatedBuildWorkspace from '../components/CreatedBuildWorkspace';

interface CreatedBuildDetailPageProps {
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

export default async function CreatedBuildDetailPage({ params, searchParams }: CreatedBuildDetailPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const currency = await resolveRequestCurrency(query.currency);
  const supabase = await createVaultClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    await redirect('/auth');
    return null;
  }

  const [{ data: build, error }, { data: games }] = await Promise.all([
    supabase
      .from('created_builds')
      .select(`
        *,
        cpu:products!cpu_id(*),
        gpu:products!gpu_id(*),
        ram:products!ram_id(*),
        motherboard:products!motherboard_id(*),
        storage:products!storage_id(*),
        psu:products!psu_id(*)
      `)
      .eq('user_id', user.id)
      .eq('slug', slug)
      .maybeSingle(),
    supabase.from('games').select('*'),
  ]);

  if (error || !build) notFound();
  return <CreatedBuildWorkspace initialBuild={build} games={games || []} currency={currency} />;
}
