import { type Task } from '@kanban/shared';
import { TaskEntity } from './task.entity';

/** Explicit entity → API mapping, so new DB columns never leak into responses by accident. */
export function toTaskDto(entity: TaskEntity): Task {
  return {
    id: entity.id,
    title: entity.title,
    description: entity.description,
    status: entity.status,
    priority: entity.priority,
    position: entity.position,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
