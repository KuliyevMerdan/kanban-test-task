import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type ApiErrorBody } from '@kanban/shared';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import type { ZodError } from 'zod';

/** Turns every error into the single `ApiErrorBody` shape the frontend relies on. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as ZodError;
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Ошибка валидации',
        details: zodError.issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();
      const { message, error } =
        typeof response === 'string'
          ? { message: response, error: undefined }
          : (response as { message?: string | string[]; error?: string });
      return {
        statusCode,
        error: error ?? exception.name,
        message: Array.isArray(message) ? message.join('; ') : (message ?? exception.message),
      };
    }

    // Errors from Express middleware (e.g. malformed JSON body) carry a 4xx `status`.
    if (isClientHttpError(exception)) {
      return { statusCode: exception.status, error: 'Bad Request', message: exception.message };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Внутренняя ошибка сервера',
    };
  }
}

function isClientHttpError(value: unknown): value is Error & { status: number } {
  if (!(value instanceof Error) || !('status' in value)) return false;
  const { status } = value;
  return typeof status === 'number' && status >= 400 && status < 500;
}
