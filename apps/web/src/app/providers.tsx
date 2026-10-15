'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { makeQueryClient } from '@/shared/api/query-client';
import { NotificationsProvider } from '@/shared/ui/notifications';

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser session (useState keeps it stable across re-renders).
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationsProvider>{children}</NotificationsProvider>
    </QueryClientProvider>
  );
}
