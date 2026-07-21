/**
 * CustomExceptionFilter — turns any thrown error into the frontend's error shape
 * ---------------------------------------------------------------------------
 * Registered globally (main.ts). It is the ONE place that maps errors to HTTP.
 * Two sources of errors converge here:
 *
 *   - DOMAIN errors thrown by use cases (ResourceNotFoundError, …). The core is
 *     framework-free, so it cannot set a status code — this adapter does, via the
 *     `errorStatusMap` below.
 *   - Nest HttpExceptions (e.g. the ValidationPipe's 422). We read their status
 *     and body directly.
 *
 * Everything leaves as:  { success: false, error: { code, message } }
 * with the right status — matching what the frontend expects.
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ResourceNotFoundError } from '../../../core/errors/resource-not-found.error';
import { ResourceAlreadyExistsError } from '../../../core/errors/resource-already-exists.error';
import { UnauthorizedError } from '../../../core/errors/unauthorized.error';
import { ValidationError } from '../../../core/errors/validation.error';

// Default code per HTTP status when an exception carries none.
const STATUS_CODE_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION',
  500: 'INTERNAL_ERROR',
};

// Map each domain error class to its HTTP status + stable code.
const DOMAIN_ERROR_MAP = new Map<Function, { status: number; code: string }>([
  [ResourceNotFoundError, { status: 404, code: 'NOT_FOUND' }],
  [ResourceAlreadyExistsError, { status: 409, code: 'CONFLICT' }],
  [UnauthorizedError, { status: 401, code: 'UNAUTHENTICATED' }],
  [ValidationError, { status: 422, code: 'VALIDATION' }],
]);

@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong. Please try again.';

    const domain = DOMAIN_ERROR_MAP.get((exception as object)?.constructor);

    if (domain) {
      // A domain error from a use case.
      status = domain.status;
      code = domain.code;
      message = (exception as Error).message;
    } else if (exception instanceof HttpException) {
      // A Nest HTTP error (thrown by us or by the ValidationPipe).
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        code = STATUS_CODE_MAP[status] ?? 'ERROR';
      } else if (res && typeof res === 'object') {
        const body = res as Record<string, unknown>;
        code = (body.code as string) ?? STATUS_CODE_MAP[status] ?? 'ERROR';
        const raw = body.message ?? message;
        // class-validator returns an ARRAY of messages; flatten to one string.
        message = Array.isArray(raw) ? raw.join(', ') : String(raw);
      }
    } else if (exception instanceof Error) {
      // An unexpected bug: log the stack, but never leak internals to the client.
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      success: false,
      error: { code, message },
    });
  }
}
