import { type MoveTaskInput, type Task, TASK_STATUSES, type TaskStatus } from '@kanban/shared';

// The tasks cache is a single array in board order (as GET /tasks returns it).
// Columns are derived by filtering, so only the relative order of tasks with the same
// status matters. That lets optimistic updates reorder the array without computing
// position keys: the exact key arrives in the server response.

export type BoardColumns = Record<TaskStatus, Task[]>;

export function groupByStatus(tasks: Task[]): BoardColumns {
  const columns = Object.fromEntries(
    TASK_STATUSES.map((status) => [status, []]),
  ) as unknown as BoardColumns;
  for (const task of tasks) columns[task.status].push(task);
  return columns;
}

/** Optimistic version of `PATCH /tasks/:id/move`, same `afterId` semantics. */
export function applyMove(tasks: Task[], id: string, move: MoveTaskInput): Task[] {
  const task = tasks.find((item) => item.id === id);
  if (!task) return tasks;

  const rest = tasks.filter((item) => item.id !== id);
  const moved: Task = { ...task, status: move.status };

  if (move.afterId === null) return [moved, ...rest];
  const anchorIndex =
    move.afterId === undefined ? -1 : rest.findIndex((item) => item.id === move.afterId);
  // Unknown anchor: the server will answer 409 and the cache is rolled back and refetched.
  if (anchorIndex === -1) return [...rest, moved];
  return [...rest.slice(0, anchorIndex + 1), moved, ...rest.slice(anchorIndex + 1)];
}

/** Replaces a task in place, or appends it (new tasks go to the end of their column). */
export function upsertTask(tasks: Task[], task: Task): Task[] {
  return tasks.some((item) => item.id === task.id)
    ? tasks.map((item) => (item.id === task.id ? task : item))
    : [...tasks, task];
}

export function removeTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((item) => item.id !== id);
}
