import { type Task, type TaskStatus } from '@kanban/shared';
import { describe, expect, it } from 'vitest';
import { applyMove, groupByStatus, insertByPosition, removeTask, upsertTask } from './model';

const task = (id: string, status: TaskStatus = 'NEW'): Task => ({
  id,
  title: id,
  description: null,
  status,
  priority: 'MEDIUM',
  position: 'V',
  createdAt: '2026-10-15T10:00:00.000Z',
  updatedAt: '2026-10-15T10:00:00.000Z',
});

/** Board as `status: ids` for compact assertions. */
const board = (tasks: Task[]) =>
  Object.fromEntries(
    Object.entries(groupByStatus(tasks)).map(([status, items]) => [status, items.map((t) => t.id)]),
  );

describe('groupByStatus', () => {
  it('splits tasks into all three columns, keeping their order', () => {
    expect(board([task('a'), task('x', 'DONE'), task('b')])).toEqual({
      NEW: ['a', 'b'],
      IN_PROGRESS: [],
      DONE: ['x'],
    });
  });
});

describe('applyMove (optimistic move)', () => {
  const tasks = [task('a'), task('b'), task('c'), task('x', 'DONE')];

  it('moves a task to the top of a column', () => {
    expect(board(applyMove(tasks, 'c', { status: 'NEW', afterId: null })).NEW).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('moves a task right after the anchor', () => {
    expect(board(applyMove(tasks, 'a', { status: 'NEW', afterId: 'b' })).NEW).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('moves a task to the end when afterId is omitted', () => {
    expect(board(applyMove(tasks, 'a', { status: 'NEW' })).NEW).toEqual(['b', 'c', 'a']);
  });

  it('moves a task to another column and updates its status', () => {
    const result = applyMove(tasks, 'b', { status: 'DONE', afterId: 'x' });

    expect(board(result)).toEqual({ NEW: ['a', 'c'], IN_PROGRESS: [], DONE: ['x', 'b'] });
    expect(result.find((t) => t.id === 'b')?.status).toBe('DONE');
  });

  it('appends to the column when the anchor is unknown (server will answer 409)', () => {
    expect(board(applyMove(tasks, 'a', { status: 'DONE', afterId: 'gone' })).DONE).toEqual([
      'x',
      'a',
    ]);
  });

  it('does not mutate the input and ignores unknown tasks', () => {
    const snapshot = structuredClone(tasks);
    applyMove(tasks, 'a', { status: 'DONE' });

    expect(tasks).toEqual(snapshot);
    expect(applyMove(tasks, 'missing', { status: 'DONE' })).toBe(tasks);
  });
});

describe('upsertTask / removeTask', () => {
  it('replaces an existing task in place', () => {
    const updated = { ...task('b'), title: 'B2' };
    const result = upsertTask([task('a'), task('b'), task('c')], updated);

    expect(result.map((t) => t.title)).toEqual(['a', 'B2', 'c']);
  });

  it('appends a new task to the end', () => {
    expect(upsertTask([task('a')], task('b')).map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('removes a task by id', () => {
    expect(removeTask([task('a'), task('b')], 'a').map((t) => t.id)).toEqual(['b']);
  });
});

describe('insertByPosition (restore after undo)', () => {
  const at = (id: string, position: string, status: TaskStatus = 'NEW') => ({
    ...task(id, status),
    position,
  });
  const tasks = [at('a', 'V'), at('c', 'X'), at('x', 'V', 'DONE')];

  it('puts the task back between its old neighbours', () => {
    expect(board(insertByPosition(tasks, at('b', 'W'))).NEW).toEqual(['a', 'b', 'c']);
  });

  it('handles the top and the end of a column', () => {
    expect(board(insertByPosition(tasks, at('first', 'U'))).NEW).toEqual(['first', 'a', 'c']);
    expect(board(insertByPosition(tasks, at('last', 'Z'))).NEW).toEqual(['a', 'c', 'last']);
  });

  it('works for an empty column and does not duplicate an existing task', () => {
    expect(board(insertByPosition(tasks, at('p', 'V', 'IN_PROGRESS'))).IN_PROGRESS).toEqual(['p']);
    expect(insertByPosition(tasks, at('a', 'V'))).toHaveLength(3);
  });
});
