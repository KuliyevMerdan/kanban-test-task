import {
  type CreateTaskInput,
  type MoveTaskInput,
  type Task,
  type UpdateTaskInput,
} from '@kanban/shared';
import { http } from '@/shared/api/http';

const json = (body: unknown) => JSON.stringify(body);

export const tasksApi = {
  list: () => http<Task[]>('/tasks'),
  create: (input: CreateTaskInput) => http<Task>('/tasks', { method: 'POST', body: json(input) }),
  update: (id: string, input: UpdateTaskInput) =>
    http<Task>(`/tasks/${id}`, { method: 'PATCH', body: json(input) }),
  // `afterId: undefined` is dropped by JSON.stringify, which means "end of column".
  move: (id: string, input: MoveTaskInput) =>
    http<Task>(`/tasks/${id}/move`, { method: 'PATCH', body: json(input) }),
  remove: (id: string) => http<void>(`/tasks/${id}`, { method: 'DELETE' }),
  restore: (id: string) => http<Task>(`/tasks/${id}/restore`, { method: 'POST' }),
};
