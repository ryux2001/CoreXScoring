import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Cliente exclusivamente de servidor para datos que nunca deben exponerse al
 * navegador, como credenciales BYOK cifradas y conversaciones privadas.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('Falta configurar una clave secreta de Supabase para operaciones server-only.');
  }

  adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return adminClient;
}
