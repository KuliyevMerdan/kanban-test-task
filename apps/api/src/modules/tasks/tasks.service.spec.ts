import { beforeEach, describe, expect, it } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TASK_STATUSES, type TaskStatus } from '@kanban/shared';
import { randomUUID } from 'node:crypto';
import { type DeepPartial } from 'typeorm';
import { TaskEntity } from './task.entity';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

type PublicOf<T> = { [K in keyof T]: T[K] };

/**
 * In-memory stand-in for TasksRepository that mirrors its SQL semantics:
 * columns in enum order, positions compared as plain strings, ties broken by id.
 */
class InMemoryTasksRepository implements PublicOf<TasksRepository> {
  private rows = new Map<string, TaskEntity>();

  async findAll() {
    return [...this.rows.values()].sort(
      (a, b) =>
        TASK_STATUSES.indexOf(a.status) - TASK_STATUSES.indexOf(b.status) ||
        compare(a.position, b.position) ||
        compare(a.id, b.id),
    );
  }

  async findById(id: string) {
    return this.copy(this.rows.get(id));
  }

  async findFirstInColumn(status: TaskStatus, excludeId?: string) {
    return this.copy(this.column(status, excludeId)[0]);
  }

  async findLastInColumn(status: TaskStatus, excludeId?: string) {
    return this.copy(this.column(status, excludeId).at(-1));
  }

  async findNextInColumn(status: TaskStatus, position: string, excludeId?: string) {
    return this.copy(this.column(status, excludeId).find((task) => task.position > position));
  }

  async create(data: DeepPartial<TaskEntity>) {
    const now = new Date();
    return this.save(
      Object.assign(new TaskEntity(), { id: randomUUID(), createdAt: now, updatedAt: now }, data),
    );
  }

  async save(task: TaskEntity) {
    this.rows.set(task.id, Object.assign(new TaskEntity(), task));
    return task;
  }

  async remove(task: TaskEntity) {
    this.rows.delete(task.id);
  }

  /** Test helper: puts a row with a hand-picked position. */
  seed(title: string, status: TaskStatus, position: string): TaskEntity {
    const task = Object.assign(new TaskEntity(), {
      id: randomUUID(),
      title,
      description: null,
      status,
      priority: 'MEDIUM',
      position,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.rows.set(task.id, task);
    return task;
  }

  private column(status: TaskStatus, excludeId?: string) {
    return [...this.rows.values()]
      .filter((task) => task.status === status && task.id !== excludeId)
      .sort((a, b) => compare(a.position, b.position) || compare(a.id, b.id));
  }

  /** Returns copies, like a real DB: mutating a result must not change stored rows. */
  private copy(task: TaskEntity | undefined) {
    return task ? Object.assign(new TaskEntity(), task) : null;
  }
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('TasksService', () => {
  let repo: InMemoryTasksRepository;
  let service: TasksService;

  /** Titles of a column in board order. */
  const column = async (status: TaskStatus) =>
    (await repo.findAll()).filter((task) => task.status === status).map((task) => task.title);

  const create = (title: string, status: TaskStatus = 'NEW') =>
    service.create({ title, status, priority: 'MEDIUM' });

  beforeEach(() => {
    repo = new InMemoryTasksRepository();
    service = new TasksService(repo as unknown as TasksRepository);
  });

  describe('create', () => {
    it('appends tasks to the end of their column', async () => {
      await create('A');
      await create('B');
      await create('X', 'DONE');
      await create('C');

      expect(await column('NEW')).toEqual(['A', 'B', 'C']);
      expect(await column('DONE')).toEqual(['X']);
    });

    it('stores an empty description as null', async () => {
      const task = await service.create({
        title: 'A',
        description: '',
        status: 'NEW',
        priority: 'LOW',
      });
      expect(task.description).toBeNull();
    });
  });

  describe('update', () => {
    it('changes only the passed fields', async () => {
      const task = await service.create({
        title: 'A',
        description: 'old',
        status: 'NEW',
        priority: 'LOW',
      });

      const updated = await service.update(task.id, { priority: 'HIGH' });

      expect(updated).toMatchObject({ title: 'A', description: 'old', priority: 'HIGH' });
    });

    it('clears the description with an empty string', async () => {
      const task = await service.create({
        title: 'A',
        description: 'old',
        status: 'NEW',
        priority: 'LOW',
      });
      expect((await service.update(task.id, { description: '' })).description).toBeNull();
    });

    it('throws NotFound for an unknown task', async () => {
      await expect(service.update(MISSING_ID, { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('move', () => {
    let a: TaskEntity;
    let b: TaskEntity;
    let c: TaskEntity;

    beforeEach(async () => {
      a = await create('A');
      b = await create('B');
      c = await create('C');
    });

    it('moves a task to the top of the column (afterId: null)', async () => {
      await service.move(c.id, { status: 'NEW', afterId: null });
      expect(await column('NEW')).toEqual(['C', 'A', 'B']);
    });

    it('moves a task right after another one', async () => {
      await service.move(a.id, { status: 'NEW', afterId: b.id });
      expect(await column('NEW')).toEqual(['B', 'A', 'C']);
    });

    it('moves a task to the end of the column (afterId omitted)', async () => {
      await service.move(a.id, { status: 'NEW' });
      expect(await column('NEW')).toEqual(['B', 'C', 'A']);
    });

    it('moves a task to another column and updates its status', async () => {
      await create('D', 'DONE');

      const moved = await service.move(b.id, { status: 'DONE', afterId: null });

      expect(moved.status).toBe('DONE');
      expect(await column('NEW')).toEqual(['A', 'C']);
      expect(await column('DONE')).toEqual(['B', 'D']);
    });

    it('moves a task into an empty column', async () => {
      await service.move(a.id, { status: 'IN_PROGRESS', afterId: null });
      expect(await column('IN_PROGRESS')).toEqual(['A']);
    });

    it('keeps the order when a task is dropped at its current place', async () => {
      await service.move(b.id, { status: 'NEW', afterId: a.id });
      expect(await column('NEW')).toEqual(['A', 'B', 'C']);
    });

    it('rejects placing a task after itself', async () => {
      await expect(service.move(a.id, { status: 'NEW', afterId: a.id })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('reports a conflict when the anchor task no longer exists', async () => {
      await expect(service.move(a.id, { status: 'NEW', afterId: MISSING_ID })).rejects.toThrow(
        ConflictException,
      );
    });

    it('reports a conflict when the anchor task is in another column', async () => {
      const done = await create('D', 'DONE');
      await expect(service.move(a.id, { status: 'NEW', afterId: done.id })).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFound for an unknown task', async () => {
      await expect(service.move(MISSING_ID, { status: 'NEW' })).rejects.toThrow(NotFoundException);
    });

    it('handles two tasks that ended up with the same position', async () => {
      // Can happen after two concurrent moves into the same slot.
      repo = new InMemoryTasksRepository();
      service = new TasksService(repo as unknown as TasksRepository);
      const x = repo.seed('X', 'NEW', 'V');
      repo.seed('Y', 'NEW', 'V');
      repo.seed('Z', 'NEW', 'k');
      const moving = repo.seed('M', 'DONE', 'V');

      await service.move(moving.id, { status: 'NEW', afterId: x.id });

      const titles = await column('NEW');
      expect(titles.indexOf('M')).toBe(2);
      expect(titles.at(-1)).toBe('Z');
    });
  });

  describe('remove', () => {
    it('deletes the task', async () => {
      const task = await create('A');
      await service.remove(task.id);
      expect(await column('NEW')).toEqual([]);
    });

    it('throws NotFound for an unknown task', async () => {
      await expect(service.remove(MISSING_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
