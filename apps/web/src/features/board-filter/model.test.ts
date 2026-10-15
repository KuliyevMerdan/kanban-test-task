import { type Task, type TaskPriority } from '@kanban/shared';
import { describe, expect, it } from 'vitest';
import { filterTasks, isFilterActive, parseFilter, writeFilter } from './model';

const task = (title: string, priority: TaskPriority, description: string | null = null): Task => ({
  id: title,
  title,
  description,
  status: 'NEW',
  priority,
  position: 'V',
  createdAt: '2026-10-15T10:00:00.000Z',
  updatedAt: '2026-10-15T10:00:00.000Z',
});

const tasks = [
  task('Купить ёлку', 'HIGH'),
  task('Написать README', 'LOW', 'Инструкция по запуску'),
  task('Миграции', 'MEDIUM'),
];
const titles = (list: Task[]) => list.map((t) => t.title);

describe('filterTasks', () => {
  it('returns everything for an empty filter', () => {
    expect(filterTasks(tasks, { query: '  ', priorities: [] })).toHaveLength(3);
  });

  it('searches title and description, case-insensitive, ё = е', () => {
    expect(titles(filterTasks(tasks, { query: 'ЕЛКУ', priorities: [] }))).toEqual(['Купить ёлку']);
    expect(titles(filterTasks(tasks, { query: 'запуск', priorities: [] }))).toEqual([
      'Написать README',
    ]);
  });

  it('filters by several priorities and combines with search', () => {
    expect(titles(filterTasks(tasks, { query: '', priorities: ['HIGH', 'LOW'] }))).toEqual([
      'Купить ёлку',
      'Написать README',
    ]);
    expect(filterTasks(tasks, { query: 'миграции', priorities: ['HIGH'] })).toEqual([]);
  });
});

describe('URL params', () => {
  it('round-trips the filter and keeps unrelated params', () => {
    const params = writeFilter(new URLSearchParams('tab=1'), {
      query: ' ёлка ',
      priorities: ['HIGH', 'LOW'],
    });

    expect(params.get('tab')).toBe('1');
    expect(parseFilter(params)).toEqual({ query: 'ёлка', priorities: ['HIGH', 'LOW'] });
  });

  it('drops empty values and ignores unknown priorities from a hand-edited URL', () => {
    expect(
      writeFilter(new URLSearchParams('q=x&priority=LOW'), {
        query: '',
        priorities: [],
      }).toString(),
    ).toBe('');
    expect(parseFilter(new URLSearchParams('priority=HIGH,URGENT,HIGH'))).toEqual({
      query: '',
      priorities: ['HIGH'],
    });
  });

  it('knows when a filter is active', () => {
    expect(isFilterActive({ query: ' ', priorities: [] })).toBe(false);
    expect(isFilterActive({ query: '', priorities: ['LOW'] })).toBe(true);
  });
});
