'use client';

import { TASKS_CHANGED_EVENT } from '@kanban/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '@/shared/api/http';
import { tasksQueryKey } from './hooks';

export type RealtimeStatus = 'connecting' | 'online' | 'offline';

/** Batches bursts of events (e.g. several quick moves) into one refetch. */
const REFETCH_DELAY_MS = 150;

/**
 * Keeps the board in sync with changes made in other tabs / on other devices.
 * The server only says "something changed"; we refetch the board, which is simpler and
 * safer than merging partial updates into the cache.
 */
export function useTasksRealtime(): RealtimeStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>('connecting');

  useEffect(() => {
    // websocket only: no long-polling fallback, so no sticky sessions needed behind a proxy.
    const socket = io(new URL(API_URL).origin, { transports: ['websocket'] });
    let timer: ReturnType<typeof setTimeout> | undefined;
    let wasConnected = false;

    const scheduleRefetch = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // Our own request is still in flight: its optimistic update must not be
        // overwritten by a refetch, so wait until it settles.
        if (queryClient.isMutating() > 0) return scheduleRefetch();
        void queryClient.invalidateQueries({ queryKey: tasksQueryKey });
      }, REFETCH_DELAY_MS);
    };

    socket.on('connect', () => {
      setStatus('online');
      // After a reconnect we may have missed events.
      if (wasConnected) scheduleRefetch();
      wasConnected = true;
    });
    socket.on('disconnect', () => setStatus('offline'));
    socket.on('connect_error', () => setStatus('offline'));
    socket.on(TASKS_CHANGED_EVENT, scheduleRefetch);

    return () => {
      clearTimeout(timer);
      socket.disconnect();
    };
  }, [queryClient]);

  return status;
}
