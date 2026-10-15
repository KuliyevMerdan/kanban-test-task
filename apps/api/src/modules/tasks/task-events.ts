import { Injectable } from '@nestjs/common';
import { type TasksChangedEvent } from '@kanban/shared';
import { Observable, Subject } from 'rxjs';

/**
 * In-process bus of task changes. The service publishes, transports (the WebSocket
 * gateway today) subscribe, so business logic knows nothing about sockets.
 */
@Injectable()
export class TaskEvents {
  private readonly subject = new Subject<TasksChangedEvent>();
  readonly changes$: Observable<TasksChangedEvent> = this.subject.asObservable();

  publish(event: TasksChangedEvent): void {
    this.subject.next(event);
  }
}
