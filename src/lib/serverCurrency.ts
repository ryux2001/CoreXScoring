import { cookies } from 'next/headers';
import {
  CURRENCY_COOKIE_NAME,
  normalizeCurrency,
  type Currency,
} from '@/lib/currency';

/**
 * Resolve request currency at the server boundary.
 * An explicit query value wins; otherwise use the browser preference cookie.
 */
export async function resolveRequestCurrency(
  searchValue?: string | null,
): Promise<Currency> {
  if (searchValue !== undefined && searchValue !== null) {
    return normalizeCurrency(searchValue);
  }

  const cookieStore = await cookies();
  return normalizeCurrency(cookieStore.get(CURRENCY_COOKIE_NAME)?.value);
}
