import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import { type Task, TASKS_CHANGED_EVENT, type TasksChangedEvent } from '@kanban/shared';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { createTestApp } from './create-test-app';

describe('Realtime (e2e)', () => {
  let app: INestApplication;
  let client: Socket;

  /** Resolves with the next `count` board events. */
  const nextEvents = (count: number) =>
    new Promise<TasksChangedEvent[]>((resolve, reject) => {
      const received: TasksChangedEvent[] = [];
      const timer = setTimeout(
        () => reject(new Error(`Got ${received.length}/${count} events`)),
        3000,
      );
      const onEvent = (event: TasksChangedEvent) => {
        received.push(event);
        if (received.length === count) {
          clearTimeout(timer);
          client.off(TASKS_CHANGED_EVENT, onEvent);
          resolve(received);
        }
      };
      client.on(TASKS_CHANGED_EVENT, onEvent);
    });

  beforeAll(async () => {
    ({ app } = await createTestApp());
    await app.listen(0);
    client = io(await app.getUrl(), { transports: ['websocket'] });
    await new Promise<void>((resolve) => client.once('connect', () => resolve()));
  });

  afterAll(async () => {
    client.disconnect();
    await app.close();
  });

  it('broadcasts every change made through the REST API', async () => {
    const http = request(app.getHttpServer());
    const events = nextEvents(4);

    const task = (await http.post('/api/tasks').send({ title: 'A' }).expect(201)).body as Task;
    await http.patch(`/api/tasks/${task.id}/move`).send({ status: 'DONE' }).expect(200);
    await http.delete(`/api/tasks/${task.id}`).expect(204);
    await http.post(`/api/tasks/${task.id}/restore`).expect(200);

    expect(await events).toEqual(
      ['created', 'moved', 'deleted', 'restored'].map((type) => ({ type, taskId: task.id })),
    );
  });

  it('sends nothing for a rejected request', async () => {
    let received = 0;
    const count = () => received++;
    client.on(TASKS_CHANGED_EVENT, count);

    await request(app.getHttpServer()).post('/api/tasks').send({ title: '' }).expect(400);
    await new Promise((resolve) => setTimeout(resolve, 200));

    client.off(TASKS_CHANGED_EVENT, count);
    expect(received).toBe(0);
  });
});
