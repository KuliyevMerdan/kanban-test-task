/** Socket.IO event broadcast to every client after any change on the board. */
export const TASKS_CHANGED_EVENT = 'tasks:changed';

export interface TasksChangedEvent {
  type: 'created' | 'updated' | 'moved' | 'deleted' | 'restored';
  taskId: string;
}
