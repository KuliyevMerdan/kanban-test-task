import { type TaskPriority, type TaskStatus } from '@kanban/shared';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  NEW: 'Новая',
  IN_PROGRESS: 'В работе',
  DONE: 'Готово',
};

export const STATUS_COLORS: Record<TaskStatus, 'info' | 'warning' | 'success'> = {
  NEW: 'info',
  IN_PROGRESS: 'warning',
  DONE: 'success',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
};

export const PRIORITY_COLORS: Record<TaskPriority, 'default' | 'warning' | 'error'> = {
  LOW: 'default',
  MEDIUM: 'warning',
  HIGH: 'error',
};
