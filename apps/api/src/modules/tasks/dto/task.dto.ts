import { createTaskSchema, moveTaskSchema, taskSchema, updateTaskSchema } from '@kanban/shared';
import { createZodDto } from 'nestjs-zod';

// DTO classes are generated from the shared zod schemas: one definition drives
// request validation, TypeScript types and the Swagger docs.
export class CreateTaskDto extends createZodDto(createTaskSchema) {}
export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}
export class MoveTaskDto extends createZodDto(moveTaskSchema) {}
export class TaskDto extends createZodDto(taskSchema) {}
