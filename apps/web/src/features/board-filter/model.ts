import { type Task, TASK_PRIORITIES, type TaskPriority } from '@kanban/shared';

// Search + priority filter. Applied on the client: the whole board is loaded anyway,
// so filtering is instant and also covers tasks that arrive in realtime.
// Kept in the URL (?q=...&priority=HIGH,MEDIUM) to survive reloads and be shareable.

export interface BoardFilter {
  query: string;
  /** Empty = all priorities. */
  priorities: TaskPriority[];
}

export const EMPTY_FILTER: BoardFilter = { query: '', priorities: [] };

export const isFilterActive = (filter: BoardFilter) =>
  filter.query.trim() !== '' || filter.priorities.length > 0;

/** Case-insensitive, treats "ё" as "е". */
const normalize = (text: string) => text.toLocaleLowerCase('ru').replaceAll('ё', 'е');

export function filterTasks(tasks: Task[], filter: BoardFilter): Task[] {
  const query = normalize(filter.query.trim());
  return tasks.filter(
    (task) =>
      (filter.priorities.length === 0 || filter.priorities.includes(task.priority)) &&
      (query === '' || normalize(`${task.title}\n${task.description ?? ''}`).includes(query)),
  );
}

export function parseFilter(params: URLSearchParams): BoardFilter {
  const priorities = (params.get('priority') ?? '')
    .split(',')
    .filter((value): value is TaskPriority =>
      (TASK_PRIORITIES as readonly string[]).includes(value),
    );
  return { query: params.get('q') ?? '', priorities: [...new Set(priorities)] };
}

/** Writes the filter into `params`, keeping unrelated params intact. */
export function writeFilter(params: URLSearchParams, filter: BoardFilter): URLSearchParams {
  const next = new URLSearchParams(params);
  if (filter.query.trim()) next.set('q', filter.query.trim());
  else next.delete('q');
  if (filter.priorities.length) next.set('priority', filter.priorities.join(','));
  else next.delete('priority');
  return next;
}
