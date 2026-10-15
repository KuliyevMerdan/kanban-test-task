import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type TaskStatus } from '@kanban/shared';
import { type DeepPartial, Repository } from 'typeorm';
import { TaskEntity } from './task.entity';

/** All task queries live here, so the service stays free of TypeORM details. */
@Injectable()
export class TasksRepository {
  constructor(@InjectRepository(TaskEntity) private readonly repo: Repository<TaskEntity>) {}

  /** Whole board: columns in enum order, tasks by position (id breaks ties). */
  findAll(): Promise<TaskEntity[]> {
    return this.repo.find({ order: { status: 'ASC', position: 'ASC', id: 'ASC' } });
  }

  findById(id: string): Promise<TaskEntity | null> {
    return this.repo.findOneBy({ id });
  }

  findFirstInColumn(status: TaskStatus, excludeId?: string): Promise<TaskEntity | null> {
    return this.columnQuery(status, excludeId).orderBy('task.position', 'ASC').getOne();
  }

  findLastInColumn(status: TaskStatus, excludeId?: string): Promise<TaskEntity | null> {
    return this.columnQuery(status, excludeId).orderBy('task.position', 'DESC').getOne();
  }

  /** First task in the column whose position is strictly greater than `position`. */
  findNextInColumn(
    status: TaskStatus,
    position: string,
    excludeId?: string,
  ): Promise<TaskEntity | null> {
    return this.columnQuery(status, excludeId)
      .andWhere('task.position > :position', { position })
      .orderBy('task.position', 'ASC')
      .getOne();
  }

  create(data: DeepPartial<TaskEntity>): Promise<TaskEntity> {
    return this.repo.save(this.repo.create(data));
  }

  save(task: TaskEntity): Promise<TaskEntity> {
    return this.repo.save(task);
  }

  /** Sets deleted_at: the row stays in the table, so the deletion can be undone. */
  async softRemove(task: TaskEntity): Promise<void> {
    await this.repo.softRemove(task);
  }

  findByIdWithDeleted(id: string): Promise<TaskEntity | null> {
    return this.repo.findOne({ where: { id }, withDeleted: true });
  }

  async restore(id: string): Promise<void> {
    await this.repo.restore({ id });
  }

  private columnQuery(status: TaskStatus, excludeId?: string) {
    const query = this.repo.createQueryBuilder('task').where('task.status = :status', { status });
    if (excludeId) query.andWhere('task.id != :excludeId', { excludeId });
    return query;
  }
}
