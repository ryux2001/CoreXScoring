import { afterEach, describe, expect, it, vi } from 'vitest';

type IntentRow = {
  token_hash: string;
  user_id: string;
  expires_at: string;
  consumed_at: string | null;
};

const state = vi.hoisted(() => ({ rows: [] as IntentRow[] }));

vi.mock('@/lib/supabaseAdmin', () => ({
  createSupabaseAdminClient: () => ({
    from: () => {
      const filters: Array<(row: IntentRow) => boolean> = [];
      let updateValues: Partial<IntentRow> | null = null;
      const builder: Record<string, (...args: never[]) => unknown> = {
        insert: (value) => {
          const row = value as Partial<IntentRow>;
          state.rows.push({
            token_hash: String(row.token_hash),
            user_id: String(row.user_id),
            expires_at: String(row.expires_at),
            consumed_at: row.consumed_at ?? null,
          });
          return Promise.resolve({ error: null });
        },
        update: (value) => {
          updateValues = value as Partial<IntentRow>;
          return builder;
        },
        eq: (column, value) => {
          filters.push((row) => row[column as keyof IntentRow] === value);
          return builder;
        },
        is: (column, value) => {
          filters.push((row) => row[column as keyof IntentRow] === value);
          return builder;
        },
        gt: (column, value) => {
          filters.push((row) => String(row[column as keyof IntentRow]) > String(value));
          return builder;
        },
        select: () => builder,
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

import { consumeGoogleDeleteIntent, createGoogleDeleteIntent } from '@/lib/auth/google-delete-intent';

describe('Google account deletion intents', () => {
  afterEach(() => {
    state.rows.length = 0;
  });

  it('requires the same user and consumes an intent once', async () => {
    const token = await createGoogleDeleteIntent('user-1');

    expect(await consumeGoogleDeleteIntent(token, 'user-2')).toBe(false);
    expect(await consumeGoogleDeleteIntent(token, 'user-1')).toBe(true);
    expect(await consumeGoogleDeleteIntent(token, 'user-1')).toBe(false);
  });

  it('rejects expired intents', async () => {
    const token = await createGoogleDeleteIntent('user-1');
    state.rows[0].expires_at = new Date(0).toISOString();

    expect(await consumeGoogleDeleteIntent(token, 'user-1')).toBe(false);
  });
});
