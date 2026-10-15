import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type TaskStatus } from '@kanban/shared';
import { generateKeyBetween } from './domain/ordering';
import { CreateTaskDto, MoveTaskDto, UpdateTaskDto } from './dto/task.dto';
import { TaskEntity } from './task.entity';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  constructor(private readonly tasks: TasksRepository) {}

  findAll(): Promise<TaskEntity[]> {
    return this.tasks.findAll();
  }

  async findOne(id: string): Promise<TaskEntity> {
    const task = await this.tasks.findById(id);
    if (!task) throw new NotFoundException('Задача не найдена');
    return task;
  }

  async create(dto: CreateTaskDto): Promise<TaskEntity> {
    const last = await this.tasks.findLastInColumn(dto.status);
    return this.tasks.create({
      title: dto.title,
      description: dto.description || null,
      priority: dto.priority,
      status: dto.status,
      position: generateKeyBetween(last?.position ?? null, null),
    });
  }

  async update(id: string, dto: UpdateTaskDto): Promise<TaskEntity> {
    const task = await this.findOne(id);
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description || null;
    if (dto.priority !== undefined) task.priority = dto.priority;
    return this.tasks.save(task);
  }

  /**
   * Moves the task to `status` column, right after `afterId`
   * (`null` = to the top, omitted = to the bottom). Only the moved row is updated.
   */
  async move(id: string, dto: MoveTaskDto): Promise<TaskEntity> {
    const task = await this.findOne(id);
    if (dto.afterId === id) {
      throw new BadRequestException('Задачу нельзя поставить после самой себя');
    }

    task.position = await this.positionAfter(dto.status, dto.afterId, id);
    task.status = dto.status;
    return this.tasks.save(task);
  }

  async remove(id: string): Promise<void> {
    await this.tasks.remove(await this.findOne(id));
  }

  private async positionAfter(
    status: TaskStatus,
    afterId: string | null | undefined,
    movedId: string,
  ): Promise<string> {
    if (afterId === undefined) {
      const last = await this.tasks.findLastInColumn(status, movedId);
      return generateKeyBetween(last?.position ?? null, null);
    }

    if (afterId === null) {
      const first = await this.tasks.findFirstInColumn(status, movedId);
      return generateKeyBetween(null, first?.position ?? null);
    }

    const anchor = await this.tasks.findById(afterId);
    if (!anchor || anchor.status !== status) {
      // The client saw a board that has changed since: the anchor was deleted or moved.
      throw new ConflictException('Доска изменилась, обновите страницу');
    }
    // "Strictly greater" skips tasks that share the anchor's key after concurrent moves.
    const next = await this.tasks.findNextInColumn(status, anchor.position, movedId);
    return generateKeyBetween(anchor.position, next?.position ?? null);
  }
}
