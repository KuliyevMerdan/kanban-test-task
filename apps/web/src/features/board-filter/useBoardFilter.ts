'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { type BoardFilter, parseFilter, writeFilter } from './model';

/** Board filter stored in the URL query string. */
export function useBoardFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filter = useMemo(
    () => parseFilter(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setFilter = useCallback(
    (next: BoardFilter) => {
      const query = writeFilter(new URLSearchParams(searchParams.toString()), next).toString();
      // replace, not push: typing in the search box must not flood the history.
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { filter, setFilter };
}
