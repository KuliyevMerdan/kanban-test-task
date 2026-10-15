import { type OnModuleDestroy } from '@nestjs/common';
import { type OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';
import { TASKS_CHANGED_EVENT } from '@kanban/shared';
import { type Subscription } from 'rxjs';
import { Server } from 'socket.io';
import { TaskEvents } from './task-events';

/**
 * Broadcasts board changes to every connected client (Socket.IO on the same port as
 * the HTTP API, path /socket.io). Clients only listen; all writes go through REST.
 */
@WebSocketGateway()
export class TasksGateway implements OnGatewayInit, OnModuleDestroy {
  private subscription?: Subscription;

  constructor(private readonly events: TaskEvents) {}

  afterInit(server: Server): void {
    this.subscription = this.events.changes$.subscribe((event) =>
      server.emit(TASKS_CHANGED_EVENT, event),
    );
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
