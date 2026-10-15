import { beforeEach, describe, expect, it } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TASK_STATUSES, type TaskStatus } from '@kanban/shared';
import { randomUUID } from 'node:crypto';
import { type DeepPartial } from 'typeorm';
import { type TasksChangedEvent } from '@kanban/shared';
import { TaskEvents } from './task-events';
import { TaskEntity } from './task.entity';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

type PublicOf<T> = { [K in keyof T]: T[K] };

/**
 * In-memory stand-in for TasksRepository that mirrors its SQL semantics:
 * columns in enum order, positions compared as plain strings, ties broken by id,
 * soft-deleted rows hidden from every finder except findByIdWithDeleted.
 */
class InMemoryTasksRepository implements PublicOf<TasksRepository> {
  private rows = new Map<string, TaskEntity>();

  async findAll() {
    return this.live().sort(
      (a, b) =>
        TASK_STATUSES.indexOf(a.status) - TASK_STATUSES.indexOf(b.status) ||
        compare(a.position, b.position) ||
        compare(a.id, b.id),
    );
  }

  async findById(id: string) {
    const task = this.rows.get(id);
    return this.copy(task?.deletedAt ? undefined : task);
  }

  async findByIdWithDeleted(id: string) {
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
      Object.assign(
        new TaskEntity(),
        { id: randomUUID(), createdAt: now, updatedAt: now, deletedAt: null },
        data,
      ),
    );
  }

  async save(task: TaskEntity) {
    this.rows.set(task.id, Object.assign(new TaskEntity(), task));
    return task;
  }

  async softRemove(task: TaskEntity) {
    this.rows.get(task.id)!.deletedAt = new Date();
  }

  async restore(id: string) {
    const task = this.rows.get(id);
    if (task) task.deletedAt = null;
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
      deletedAt: null,
    });
    this.rows.set(task.id, task);
    return task;
  }

  private live() {
    return [...this.rows.values()].filter((task) => !task.deletedAt);
  }

  private column(status: TaskStatus, excludeId?: string) {
    return this.live()
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
  let events: TasksChangedEvent[];

  /** Titles of a column in board order. */
  const column = async (status: TaskStatus) =>
    (await repo.findAll()).filter((task) => task.status === status).map((task) => task.title);

  const create = (title: string, status: TaskStatus = 'NEW') =>
    service.create({ title, status, priority: 'MEDIUM' });

  const makeService = (repository: InMemoryTasksRepository) => {
    events = [];
    const bus = new TaskEvents();
    bus.changes$.subscribe((event) => events.push(event));
    return new TasksService(repository as unknown as TasksRepository, bus);
  };

  beforeEach(() => {
    repo = new InMemoryTasksRepository();
    service = makeService(repo);
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
      service = makeService(repo);
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

    it('hides a deleted task from reads and moves', async () => {
      const task = await create('A');
      await service.remove(task.id);

      await expect(service.findOne(task.id)).rejects.toThrow(NotFoundException);
      await expect(service.move(task.id, { status: 'DONE' })).rejects.toThrow(NotFoundException);
      await expect(service.remove(task.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('events', () => {
    it('publishes an event for every successful change', async () => {
      const task = await create('A');
      await service.update(task.id, { title: 'B' });
      await service.move(task.id, { status: 'DONE' });
      await service.remove(task.id);
      await service.restore(task.id);

      expect(events).toEqual(
        ['created', 'updated', 'moved', 'deleted', 'restored'].map((type) => ({
          type,
          taskId: task.id,
        })),
      );
    });

    it('publishes nothing when an operation fails', async () => {
      await expect(service.move(MISSING_ID, { status: 'DONE' })).rejects.toThrow();
      await expect(service.remove(MISSING_ID)).rejects.toThrow();
      expect(events).toEqual([]);
    });
  });

  describe('restore', () => {
    it('brings a deleted task back to its old place', async () => {
      await create('A');
      const b = await create('B');
      await create('C');
      await service.remove(b.id);

      const restored = await service.restore(b.id);

      expect(restored.title).toBe('B');
      expect(await column('NEW')).toEqual(['A', 'B', 'C']);
    });

    it('is idempotent for a task that is not deleted', async () => {
      const task = await create('A');
      await expect(service.restore(task.id)).resolves.toMatchObject({ id: task.id });
      expect(await column('NEW')).toEqual(['A']);
    });

    it('throws NotFound for an unknown task', async () => {
      await expect(service.restore(MISSING_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
