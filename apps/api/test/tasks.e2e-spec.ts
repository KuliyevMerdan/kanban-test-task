import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import { type ApiErrorBody, type Task, type TaskStatus, taskSchema } from '@kanban/shared';
import request from 'supertest';
import { type DataSource } from 'typeorm';
import { createTestApp } from './create-test-app';

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('Tasks API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const api = () => request(app.getHttpServer());

  const createTask = async (title: string, status: TaskStatus = 'NEW'): Promise<Task> => {
    const res = await api().post('/api/tasks').send({ title, status }).expect(201);
    return res.body as Task;
  };

  /** Titles per column, read back from the API (i.e. from the database). */
  const board = async (): Promise<Record<TaskStatus, string[]>> => {
    const res = await api().get('/api/tasks').expect(200);
    const result: Record<TaskStatus, string[]> = { NEW: [], IN_PROGRESS: [], DONE: [] };
    for (const task of res.body as Task[]) result[task.status].push(task.title);
    return result;
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE tasks');
  });

  afterAll(async () => {
    await app.close();
  });

  it('has migrations in sync with the entities', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();
    expect(pending.upQueries).toEqual([]);
  });

  it('GET /api/health reports ok when the database is reachable', async () => {
    await api().get('/api/health').expect(200, { status: 'ok' });
  });

  describe('create and read', () => {
    it('returns an empty board', async () => {
      await api().get('/api/tasks').expect(200, []);
    });

    it('creates a task with defaults that matches the shared contract', async () => {
      const res = await api().post('/api/tasks').send({ title: '  Купить молоко  ' }).expect(201);

      const task = taskSchema.parse(res.body);
      expect(task).toMatchObject({
        title: 'Купить молоко',
        description: null,
        status: 'NEW',
        priority: 'MEDIUM',
      });
      await api().get(`/api/tasks/${task.id}`).expect(200, res.body);
    });

    it('keeps creation order inside each column', async () => {
      await createTask('A');
      await createTask('X', 'DONE');
      await createTask('B');

      expect(await board()).toEqual({ NEW: ['A', 'B'], IN_PROGRESS: [], DONE: ['X'] });
    });

    it('rejects invalid input with field-level details', async () => {
      const res = await api()
        .post('/api/tasks')
        .send({ title: '   ', priority: 'URGENT' })
        .expect(400);

      const body = res.body as ApiErrorBody;
      expect(body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
      expect(body.details?.map((detail) => detail.path).sort()).toEqual(['priority', 'title']);
    });

    it('rejects malformed JSON with 400 instead of 500', async () => {
      await api()
        .post('/api/tasks')
        .set('Content-Type', 'application/json')
        .send('{"title":')
        .expect(400);
    });

    it('answers 400 for a malformed id and 404 for an unknown one', async () => {
      await api().get('/api/tasks/not-a-uuid').expect(400);
      const res = await api().get(`/api/tasks/${MISSING_ID}`).expect(404);
      expect((res.body as ApiErrorBody).message).toBeTruthy();
    });
  });

  describe('update', () => {
    it('updates content and clears the description', async () => {
      const task = await createTask('A');

      const res = await api()
        .patch(`/api/tasks/${task.id}`)
        .send({ title: 'A2', priority: 'HIGH', description: '' })
        .expect(200);

      expect(res.body).toMatchObject({ title: 'A2', priority: 'HIGH', description: null });
    });

    it('rejects an empty update', async () => {
      const task = await createTask('A');
      await api().patch(`/api/tasks/${task.id}`).send({}).expect(400);
    });
  });

  describe('move', () => {
    it('reorders tasks and moves them between columns, persistently', async () => {
      const a = await createTask('A');
      const b = await createTask('B');
      const c = await createTask('C');

      await api()
        .patch(`/api/tasks/${c.id}/move`)
        .send({ status: 'NEW', afterId: null })
        .expect(200);
      await api()
        .patch(`/api/tasks/${a.id}/move`)
        .send({ status: 'NEW', afterId: b.id })
        .expect(200);
      await api().patch(`/api/tasks/${b.id}/move`).send({ status: 'IN_PROGRESS' }).expect(200);

      // Read back from the database, as after a page reload.
      expect(await board()).toEqual({ NEW: ['C', 'A'], IN_PROGRESS: ['B'], DONE: [] });
    });

    it('answers 409 when the anchor task was moved to another column', async () => {
      const a = await createTask('A');
      const done = await createTask('D', 'DONE');

      const res = await api()
        .patch(`/api/tasks/${a.id}/move`)
        .send({ status: 'NEW', afterId: done.id })
        .expect(409);
      expect((res.body as ApiErrorBody).statusCode).toBe(409);
    });

    it('rejects an unknown column and placing a task after itself', async () => {
      const a = await createTask('A');
      await api().patch(`/api/tasks/${a.id}/move`).send({ status: 'ARCHIVE' }).expect(400);
      await api()
        .patch(`/api/tasks/${a.id}/move`)
        .send({ status: 'NEW', afterId: a.id })
        .expect(400);
    });

    it('orders positions byte-wise in Postgres (COLLATE "C"), like the key generator', async () => {
      // Under a locale-aware collation "a" would sort before "B".
      for (const [title, position] of [
        ['lower', 'a'],
        ['upper', 'B'],
        ['digit', '5'],
      ]) {
        await dataSource.query('INSERT INTO tasks (title, position) VALUES ($1, $2)', [
          title,
          position,
        ]);
      }

      expect((await board()).NEW).toEqual(['digit', 'upper', 'lower']);
    });
  });

  describe('delete', () => {
    it('deletes a task, then answers 404', async () => {
      const task = await createTask('A');

      await api().delete(`/api/tasks/${task.id}`).expect(204);
      await api().delete(`/api/tasks/${task.id}`).expect(404);
      expect((await board()).NEW).toEqual([]);
    });

    it('undoes a deletion: the task comes back to its old place', async () => {
      await createTask('A');
      const b = await createTask('B');
      await createTask('C');
      await api().delete(`/api/tasks/${b.id}`).expect(204);
      await api().get(`/api/tasks/${b.id}`).expect(404);

      const res = await api().post(`/api/tasks/${b.id}/restore`).expect(200);

      expect(taskSchema.parse(res.body)).toMatchObject({ id: b.id, position: b.position });
      expect((await board()).NEW).toEqual(['A', 'B', 'C']);
    });

    it('answers 404 when restoring an unknown task', async () => {
      await api().post(`/api/tasks/${MISSING_ID}/restore`).expect(404);
    });
  });
});
