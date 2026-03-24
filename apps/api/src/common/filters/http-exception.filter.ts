import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProduction = process.env.NODE_ENV === 'production';

    if (statusCode >= 500) {
      this.logger.error(
        `${req.method} ${req.url} — ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const message = this.resolveMessage(exception, statusCode, isProduction);
    const errorLabel = this.resolveErrorLabel(exception, statusCode);

    const body: ErrorResponseBody = {
      statusCode,
      message,
      error: errorLabel,
      timestamp: new Date().toISOString(),
      path: req.url,
    };

    res.status(statusCode).json(body);
  }

  private resolveMessage(
    exception: unknown,
    statusCode: number,
    isProduction: boolean,
  ): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') return response;
      if (typeof response === 'object' && response !== null) {
        const msg = (response as Record<string, unknown>).message;
        if (Array.isArray(msg)) return msg.join('; ');
        if (typeof msg === 'string') return msg;
      }
      return exception.message;
    }

    if (statusCode >= 500 && isProduction) {
      return 'An unexpected error occurred. Please try again later.';
    }

    return exception instanceof Error ? exception.message : 'Internal server error';
  }

  private resolveErrorLabel(exception: unknown, statusCode: number): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const err = (response as Record<string, unknown>).error;
        if (typeof err === 'string') return err;
      }
    }

    const labels: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };

    return labels[statusCode] ?? 'Error';
  }
}
