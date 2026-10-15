'use client';

import {
  type CreateTaskInput,
  type MoveTaskInput,
  type Task,
  type UpdateTaskInput,
} from '@kanban/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from './api';
import { applyMove, insertByPosition, removeTask, upsertTask } from './model';

export const tasksQueryKey = ['tasks'] as const;
const moveMutationKey = ['tasks', 'move'] as const;

export function useTasks() {
  return useQuery({ queryKey: tasksQueryKey, queryFn: tasksApi.list });
}

/** Typed helper around setQueryData for the tasks list. */
function useTasksCache() {
  const queryClient = useQueryClient();
  return {
    queryClient,
    get: () => queryClient.getQueryData<Task[]>(tasksQueryKey),
    update: (updater: (tasks: Task[]) => Task[]) =>
      queryClient.setQueryData<Task[]>(tasksQueryKey, (tasks) => tasks && updater(tasks)),
    set: (tasks: Task[] | undefined) => queryClient.setQueryData(tasksQueryKey, tasks),
    cancel: () => queryClient.cancelQueries({ queryKey: tasksQueryKey }),
    refetch: () => queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
  };
}

export function useCreateTask() {
  const cache = useTasksCache();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.create(input),
    onSuccess: (task) => cache.update((tasks) => upsertTask(tasks, task)),
  });
}

export function useUpdateTask() {
  const cache = useTasksCache();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      tasksApi.update(id, input),
    onSuccess: (task) => cache.update((tasks) => upsertTask(tasks, task)),
  });
}

/** Optimistic: the card moves instantly and jumps back if the server rejects the move. */
export function useMoveTask() {
  const cache = useTasksCache();
  return useMutation({
    mutationKey: moveMutationKey,
    mutationFn: ({ id, input }: { id: string; input: MoveTaskInput }) => tasksApi.move(id, input),
    onMutate: async ({ id, input }) => {
      await cache.cancel();
      const previous = cache.get();
      cache.update((tasks) => applyMove(tasks, id, input));
      return { previous };
    },
    onError: (_error, _variables, context) => cache.set(context?.previous),
    onSuccess: (task) => cache.update((tasks) => upsertTask(tasks, task)),
    onSettled: () => {
      // Resync with the server once the last of several quick moves has finished.
      if (cache.queryClient.isMutating({ mutationKey: moveMutationKey }) === 1) {
        void cache.refetch();
      }
    },
  });
}

/** Optimistic: the card disappears instantly and comes back if deletion fails. */
export function useDeleteTask() {
  const cache = useTasksCache();
  return useMutation({
    mutationFn: (id: string) => tasksApi.remove(id),
    onMutate: async (id) => {
      await cache.cancel();
      const previous = cache.get();
      cache.update((tasks) => removeTask(tasks, id));
      return { previous };
    },
    onError: (_error, _id, context) => cache.set(context?.previous),
  });
}

/** Undo of a deletion: the task returns to its old place in the column. */
export function useRestoreTask() {
  const cache = useTasksCache();
  return useMutation({
    mutationFn: (id: string) => tasksApi.restore(id),
    onSuccess: (task) => cache.update((tasks) => insertByPosition(tasks, task)),
  });
}
