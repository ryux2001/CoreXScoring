import { createHash, randomBytes } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

export const RECOVERY_PROOF_COOKIE = 'corex-recovery-proof';
export const RECOVERY_PROOF_TTL_SECONDS = 10 * 60;

function hashProof(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createRecoveryProof(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const { error } = await createSupabaseAdminClient()
    .from('auth_recovery_proofs')
    .insert({
      token_hash: hashProof(token),
      user_id: userId,
      expires_at: new Date(Date.now() + RECOVERY_PROOF_TTL_SECONDS * 1000).toISOString(),
    });

  if (error) throw error;
  return token;
}

export async function hasActiveRecoveryProof(token: string | undefined) {
  if (!token) return false;

  const { data, error } = await createSupabaseAdminClient()
    .from('auth_recovery_proofs')
    .select('token_hash')
    .eq('token_hash', hashProof(token))
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  return !error && Boolean(data);
}

export async function consumeRecoveryProof(token: string, userId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from('auth_recovery_proofs')
    .update({ consumed_at: new Date().toISOString() })
    .eq('token_hash', hashProof(token))
    .eq('user_id', userId)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('token_hash')
    .maybeSingle();

  return !error && Boolean(data);
}
