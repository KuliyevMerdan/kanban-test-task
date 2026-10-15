import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TITLE_MAX_LENGTH,
  type TaskPriority,
  type TaskStatus,
} from '@kanban/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tasks' })
@Index('IDX_tasks_status_position', ['status', 'position'])
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: TASK_TITLE_MAX_LENGTH })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: [...TASK_STATUSES], enumName: 'task_status', default: 'NEW' })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: [...TASK_PRIORITIES],
    enumName: 'task_priority',
    default: 'MEDIUM',
  })
  priority: TaskPriority;

  /**
   * Fractional index (see domain/ordering.ts). Collation "C" makes Postgres compare
   * positions byte by byte, exactly like JS string comparison does. With the default
   * locale-aware collation, ORDER BY could disagree with the keys we generate.
   */
  @Column({ type: 'varchar', collation: 'C' })
  position: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
