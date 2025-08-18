import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CourseProgressSyncService } from 'src/modules/course/course-progress-sync.service';

// Decorator to mark methods that should trigger progress synchronization
export const SYNC_PROGRESS_KEY = 'syncProgress';
export const SyncProgress = (courseIdParam: string = 'courseId') =>
  SetMetadata(SYNC_PROGRESS_KEY, courseIdParam);

@Injectable()
export class ProgressSyncInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ProgressSyncInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly courseProgressSyncService: CourseProgressSyncService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const courseIdParam = this.reflector.get<string>(
      SYNC_PROGRESS_KEY,
      context.getHandler(),
    );

    if (!courseIdParam) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const courseId = this.extractCourseId(request, courseIdParam);

    if (!courseId) {
      this.logger.warn(
        `Could not extract courseId from parameter: ${courseIdParam}`,
      );
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        try {
          this.logger.debug(`Synchronizing progress for course ${courseId}`);
          await this.courseProgressSyncService.synchronizeProgressWithContent(
            Number(courseId),
          );
        } catch (error) {
          this.logger.error(
            `Failed to synchronize progress for course ${courseId}`,
            error,
          );
          // Don't throw error to avoid breaking the main operation
        }
      }),
    );
  }

  private extractCourseId(
    request: any,
    paramName: string,
  ): string | number | null {
    // Try to get from path parameters
    if (request.params && request.params[paramName]) {
      return request.params[paramName];
    }

    // Try to get from query parameters
    if (request.query && request.query[paramName]) {
      return request.query[paramName];
    }

    // Try to get from body
    if (request.body && request.body[paramName]) {
      return request.body[paramName];
    }

    return null;
  }
}
