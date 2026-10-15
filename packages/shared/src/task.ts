import { z } from 'zod';

/** Board columns, in display order. */
export const TASK_STATUSES = ['NEW', 'IN_PROGRESS', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_TITLE_MAX_LENGTH = 200;
export const TASK_DESCRIPTION_MAX_LENGTH = 5000;

export const taskStatusSchema = z.enum(TASK_STATUSES);
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

const titleSchema = z
  .string()
  .trim()
  .min(1, 'Введите название')
  .max(TASK_TITLE_MAX_LENGTH, `Не длиннее ${TASK_TITLE_MAX_LENGTH} символов`);

const descriptionSchema = z
  .string()
  .trim()
  .max(TASK_DESCRIPTION_MAX_LENGTH, `Не длиннее ${TASK_DESCRIPTION_MAX_LENGTH} символов`);

/** Task as returned by the API. */
export const taskSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  /**
   * Fractional index: tasks inside a column are ordered by plain string comparison
   * of `position` (ties broken by `id`).
   */
  position: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Task = z.infer<typeof taskSchema>;

export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  priority: taskPrioritySchema.default('MEDIUM'),
  /** Column to create the task in; the task is appended to the end of it. */
  status: taskStatusSchema.default('NEW'),
});
export type CreateTaskInput = z.input<typeof createTaskSchema>;

/** Content edit. Column and order change only through the move endpoint. */
export const updateTaskSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema,
    priority: taskPrioritySchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Нужно передать хотя бы одно поле');
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;

export const moveTaskSchema = z.object({
  status: taskStatusSchema,
  /**
   * Task to place the moved task right after (in the target column):
   * - omitted: append to the end of the column;
   * - `null`: put at the top of the column;
   * - id: put right after that task.
   */
  afterId: z.uuid().nullable().optional(),
});
export type MoveTaskInput = z.input<typeof moveTaskSchema>;
