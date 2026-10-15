import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './http';

const MAX_RETRIES = 3;

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        // Retry network errors and 5xx (e.g. a free-tier server waking up), never 4xx.
        retry: (failureCount, error) =>
          failureCount < MAX_RETRIES &&
          !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
      mutations: { retry: false },
    },
  });
}
