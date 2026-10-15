import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEvents } from './task-events';
import { TaskEntity } from './task.entity';
import { TasksController } from './tasks.controller';
import { TasksGateway } from './tasks.gateway';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity])],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository, TaskEvents, TasksGateway],
})
export class TasksModule {}
