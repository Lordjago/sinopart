/**
 * HttpResponseInterceptor — wraps every successful response in the API envelope
 * ---------------------------------------------------------------------------
 * Registered globally (main.ts). Whatever a use case returns, the client sees:
 *
 *     { success: true, data: <return value> }
 *
 * ...and for a list (a use case that returns a `Page` value object) the page
 * metadata is lifted to the top level, matching the frontend's expectation:
 *
 *     { success: true, data: [...], pagination: { page, limit, total, totalPages } }
 *
 * Doing this in one interceptor means controllers just return plain data and
 * never hand-wrap responses.
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Page } from '../../../core/domain/value-object/page';

@Injectable()
export class HttpResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        if (payload instanceof Page) {
          return {
            success: true,
            data: payload.data,
            pagination: {
              page: payload.page,
              limit: payload.limit,
              total: payload.total,
              totalPages: payload.totalPages,
            },
          };
        }
        return { success: true, data: payload };
      }),
    );
  }
}
