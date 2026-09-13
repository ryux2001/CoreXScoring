import { afterEach, describe, expect, it, vi } from 'vitest';

type RecoveryRow = {
  token_hash: string;
  user_id: string;
  expires_at: string;
  consumed_at: string | null;
};

const state = vi.hoisted(() => ({ rows: [] as RecoveryRow[] }));

vi.mock('@/lib/supabaseAdmin', () => ({
  createSupabaseAdminClient: () => ({
    from: () => {
      const filters: Array<(row: RecoveryRow) => boolean> = [];
      let updateValues: Partial<RecoveryRow> | null = null;

      const builder: Record<string, (...args: never[]) => unknown> = {
        insert: (value) => {
          const row = value as Partial<RecoveryRow>;
          state.rows.push({
            token_hash: String(row.token_hash),
            user_id: String(row.user_id),
            expires_at: String(row.expires_at),
            consumed_at: row.consumed_at ?? null,
          });
          return Promise.resolve({ error: null });
        },
        select: () => builder,
        eq: (column, value) => {
          filters.push((row) => row[column as keyof RecoveryRow] === value);
          return builder;
        },
        is: (column, value) => {
          filters.push((row) => row[column as keyof RecoveryRow] === value);
          return builder;
        },
        gt: (column, value) => {
          filters.push((row) => String(row[column as keyof RecoveryRow]) > String(value));
          return builder;
        },
        update: (value) => {
          updateValues = value as Partial<RecoveryRow>;
          return builder;
        },
        maybeSingle: () => {
          const row = state.rows.find((candidate) => filters.every((filter) => filter(candidate)));

          if (row && updateValues) Object.assign(row, updateValues);
          return Promise.resolve({ data: row ? { token_hash: row.token_hash } : null, error: null });
        },
      };

      return builder;
    },
  }),
}));

import {
  consumeRecoveryProof,
  createRecoveryProof,
  hasActiveRecoveryProof,
} from '@/lib/auth/recovery-proof';
import {
  isAcceptablePassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '@/lib/auth/password-policy';

describe('password recovery security', () => {
  afterEach(() => {
    state.rows.length = 0;
  });

  it('creates a one-time proof that cannot be consumed twice', async () => {
    const token = await createRecoveryProof('user-1');

    expect(await hasActiveRecoveryProof(token)).toBe(true);
    expect(await consumeRecoveryProof(token, 'user-1')).toBe(true);
    expect(await hasActiveRecoveryProof(token)).toBe(false);
    expect(await consumeRecoveryProof(token, 'user-1')).toBe(false);
  });

  it('rejects expired proofs and proofs for another user', async () => {
    const token = await createRecoveryProof('user-1');
    state.rows[0].expires_at = new Date(0).toISOString();

    expect(await hasActiveRecoveryProof(token)).toBe(false);
    expect(await consumeRecoveryProof(token, 'user-1')).toBe(false);

    const freshToken = await createRecoveryProof('user-1');
    expect(await consumeRecoveryProof(freshToken, 'user-2')).toBe(false);
  });

  it('keeps password length validation bounded', () => {
    expect(isAcceptablePassword('a'.repeat(MIN_PASSWORD_LENGTH))).toBe(true);
    expect(isAcceptablePassword('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toBe(false);
    expect(isAcceptablePassword('a'.repeat(MAX_PASSWORD_LENGTH + 1))).toBe(false);
  });
});
