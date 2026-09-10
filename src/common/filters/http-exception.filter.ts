import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error: unknown = null;
    let data: unknown = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse) {
        const body = exceptionResponse as Record<string, unknown>;
        message = (body.message as string | string[]) || exception.message;
        data = body.data ?? null;
        error = body.errors ?? body.error ?? null;

        // Preserve existing API envelope fields when present
        if (typeof body.statusCode === 'number') {
          statusCode = body.statusCode;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `${request.method} ${request.url} — ${exception.message}`,
        exception.stack,
      );
      message = isProduction ? 'Internal server error' : exception.message;
    } else {
      this.logger.error(
        `${request.method} ${request.url} — Unexpected non-Error throw`,
      );
    }

    if (exception instanceof HttpException && statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} — ${JSON.stringify(message)}`,
        exception.stack,
      );
    }

    response.status(statusCode).json({
      statusCode,
      message,
      data: data ?? null,
      error: this.sanitizeError(error, isProduction),
      ...(isProduction ? {} : {}),
    });
  }

  private sanitizeError(error: unknown, isProduction: boolean) {
    if (!error) return null;
    if (isProduction && typeof error === 'object') {
      const safe = error as Record<string, unknown>;
      return {
        code: safe.code ?? undefined,
        message: safe.message ?? undefined,
      };
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      ('stack' in error || 'name' in error)
    ) {
      const err = error as Error & { code?: string };
      return {
        code: err.code,
        message: err.message,
      };
    }
    return error;
  }
}
