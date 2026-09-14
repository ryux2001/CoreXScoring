import { createHash, randomBytes } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

export const GOOGLE_DELETE_INTENT_COOKIE = 'corex-google-delete-intent';
export const GOOGLE_DELETE_INTENT_TTL_SECONDS = 10 * 60;

function hashIntent(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createGoogleDeleteIntent(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const { error } = await createSupabaseAdminClient()
    .from('auth_google_delete_intents')
    .insert({
      token_hash: hashIntent(token),
      user_id: userId,
      expires_at: new Date(Date.now() + GOOGLE_DELETE_INTENT_TTL_SECONDS * 1000).toISOString(),
    });

  if (error) throw error;
  return token;
}

export async function consumeGoogleDeleteIntent(token: string, userId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from('auth_google_delete_intents')
    .update({ consumed_at: new Date().toISOString() })
    .eq('token_hash', hashIntent(token))
    .eq('user_id', userId)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('token_hash')
    .maybeSingle();

  return !error && Boolean(data);
}
