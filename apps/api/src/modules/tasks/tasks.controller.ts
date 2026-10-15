import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type Task } from '@kanban/shared';
import { CreateTaskDto, MoveTaskDto, TaskDto, UpdateTaskDto } from './dto/task.dto';
import { toTaskDto } from './task.mapper';
import { TasksService } from './tasks.service';

// Rejects malformed ids with 400 before they reach Postgres (which would answer with a 500).
const IdParam = () => Param('id', ParseUUIDPipe);

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Все задачи доски (по колонкам и порядку внутри колонки)' })
  @ApiOkResponse({ type: [TaskDto] })
  async findAll(): Promise<Task[]> {
    return (await this.tasksService.findAll()).map(toTaskDto);
  }

  @Get(':id')
  @ApiOkResponse({ type: TaskDto })
  @ApiNotFoundResponse()
  async findOne(@IdParam() id: string): Promise<Task> {
    return toTaskDto(await this.tasksService.findOne(id));
  }

  @Post()
  @ApiOperation({ summary: 'Создать задачу (добавляется в конец колонки)' })
  @ApiCreatedResponse({ type: TaskDto })
  @ApiBadRequestResponse()
  async create(@Body() dto: CreateTaskDto): Promise<Task> {
    return toTaskDto(await this.tasksService.create(dto));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Изменить название, описание или приоритет' })
  @ApiOkResponse({ type: TaskDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  async update(@IdParam() id: string, @Body() dto: UpdateTaskDto): Promise<Task> {
    return toTaskDto(await this.tasksService.update(id, dto));
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Переместить задачу в колонку и/или на новое место в ней' })
  @ApiOkResponse({ type: TaskDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'Соседняя задача уже удалена или перемещена' })
  async move(@IdParam() id: string, @Body() dto: MoveTaskDto): Promise<Task> {
    return toTaskDto(await this.tasksService.move(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(@IdParam() id: string): Promise<void> {
    await this.tasksService.remove(id);
  }
}
