import { vi } from "vitest";

export interface QueryResult<T> {
  data: T;
  error: { code?: string; message?: string } | null;
}

/**
 * Query builder mínimo para las tools: conserva los filtros llamados y se
 * resuelve como una respuesta Supabase cuando se espera con `await`.
 */
export function createQueryBuilder<T>(result: QueryResult<T>, onIn?: (values: unknown[]) => QueryResult<T>, onEq?: (column: string, value: unknown) => QueryResult<T>) {
  let activeResult = result;
  const builder = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    or: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      if (onEq) activeResult = onEq(column, value);
      return builder;
    }),
    ilike: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    in: vi.fn((_column: string, values: unknown[]) => {
      if (onIn) activeResult = onIn(values);
      return builder;
    }),
    update: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => activeResult),
    then: <TResult>(resolve: (value: QueryResult<T>) => TResult) => Promise.resolve(resolve(activeResult)),
  };
  return builder;
}

export function createSupabaseStub<T>(result: QueryResult<T>) {
  const builder = createQueryBuilder(result);
  return {
    from: vi.fn(() => builder),
    rpc: vi.fn(async () => result),
    builder,
  };
}
