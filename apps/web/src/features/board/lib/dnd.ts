import { type MoveTaskInput, TASK_STATUSES, type TaskStatus } from '@kanban/shared';
import { type BoardColumns } from '@/entities/task/model';

// Pure drag-and-drop logic, independent of dnd-kit and React.
// Droppable ids are either a task id (a card) or a status (a column's empty area).

export type ColumnIds = Record<TaskStatus, string[]>;

export const isStatus = (id: string): id is TaskStatus =>
  (TASK_STATUSES as readonly string[]).includes(id);

export function toColumnIds(columns: BoardColumns): ColumnIds {
  return Object.fromEntries(
    TASK_STATUSES.map((status) => [status, columns[status].map((task) => task.id)]),
  ) as ColumnIds;
}

/** Column that contains the card `id`, or the column itself if `id` is a status. */
export function findColumn(columns: ColumnIds, id: string): TaskStatus | null {
  if (isStatus(id)) return id;
  return TASK_STATUSES.find((status) => columns[status].includes(id)) ?? null;
}

/**
 * Live preview while a card is dragged over another column: moves it there, in front of
 * the hovered card (or to the end when hovering the column itself).
 * Returns null when nothing changes.
 */
export function moveAcrossColumns(
  columns: ColumnIds,
  activeId: string,
  overId: string,
): ColumnIds | null {
  const from = findColumn(columns, activeId);
  const to = findColumn(columns, overId);
  if (!from || !to || from === to) return null;

  const target = columns[to];
  const overIndex = target.indexOf(overId);
  const index = overIndex === -1 ? target.length : overIndex;

  return {
    ...columns,
    [from]: columns[from].filter((id) => id !== activeId),
    [to]: [...target.slice(0, index), activeId, ...target.slice(index)],
  };
}

/**
 * Turns the final drop into the payload of `PATCH /tasks/:id/move`,
 * or null when the card ends up exactly where it started.
 */
export function resolveDrop(
  original: ColumnIds,
  preview: ColumnIds,
  activeId: string,
  overId: string,
): MoveTaskInput | null {
  const status = findColumn(preview, activeId);
  const from = findColumn(original, activeId);
  if (!status || !from) return null;

  let ids = preview[status];
  if (ids.includes(overId) && overId !== activeId) {
    ids = arrayMove(ids, ids.indexOf(activeId), ids.indexOf(overId));
  }

  const afterId = predecessor(ids, activeId);
  if (status === from && afterId === predecessor(original[from], activeId)) return null;
  return { status, afterId };
}

function predecessor(ids: string[], id: string): string | null {
  const index = ids.indexOf(id);
  return index > 0 ? ids[index - 1]! : null;
}

function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item!);
  return result;
}
