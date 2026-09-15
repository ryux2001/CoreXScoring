'use client';

import { useEffect } from 'react';
import { usePathname } from '@/i18n/navigation';
import { normalizeCurrency, setCurrencyPreference } from '@/lib/currency';

/** Keep an explicit URL currency as the browser-wide preference after hydration. */
export default function CurrencyPreferenceSync() {
  const pathname = usePathname();

  useEffect(() => {
    const searchValue = new URLSearchParams(window.location.search).get('currency');
    if (searchValue !== null) {
      setCurrencyPreference(normalizeCurrency(searchValue));
    }
  }, [pathname]);

  return null;
}
