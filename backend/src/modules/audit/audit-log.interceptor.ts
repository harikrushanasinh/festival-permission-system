import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { AuditLogsService } from './audit-logs.service.js';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const SENSITIVE_FIELDS = ['password', 'newPassword', 'confirmPassword', 'token', 'refreshToken', 'accessToken'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERSION_SEGMENT_RE = /^v\d+$/i;

const VERB_BY_METHOD: Record<string, string> = {
  POST: 'CREATE',
  PATCH: 'UPDATE',
  PUT: 'UPDATE',
  DELETE: 'DELETE',
};

function sanitize(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body ?? null;
  const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const field of SENSITIVE_FIELDS) {
    if (field in clone) clone[field] = '[REDACTED]';
  }
  return clone;
}

/**
 * Derives entity type/id/action from the request path alone, so every route gets an
 * audit entry for free without each controller having to report what it touched.
 * Example: PATCH /api/v1/applications/<uuid>/approve -> entityType "applications",
 * entityId <uuid>, action "APPLICATIONS.APPROVE". Plain CRUD with no sub-action segment
 * (e.g. POST /api/v1/festivals) falls back to the HTTP-verb mapping: "FESTIVALS.CREATE".
 */
function classify(method: string, path: string): { entityType: string; entityId: string | null; action: string } {
  const segments = path.split('/').filter((segment) => segment && segment !== 'api' && !VERSION_SEGMENT_RE.test(segment));
  const entityId = segments.find((segment) => UUID_RE.test(segment)) ?? null;
  const nonUuidSegments = segments.filter((segment) => !UUID_RE.test(segment));
  const entityType = nonUuidSegments[0] ?? 'unknown';
  const lastSegment = nonUuidSegments[nonUuidSegments.length - 1];
  const hasSubAction = nonUuidSegments.length > 1 && lastSegment !== entityType;
  const verb = hasSubAction ? lastSegment : VERB_BY_METHOD[method] ?? method;
  return { entityType, entityId, action: `${entityType}.${verb}`.toUpperCase() };
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();

    // Only authenticated mutations are worth recording, and the audit-logs endpoints
    // themselves are read-only today - the guard below just keeps them out of scope
    // if that ever changes, so the log never has to describe reading itself.
    if (!MUTATING_METHODS.has(request.method) || !request.user || request.path.includes('/audit-logs')) {
      return next.handle();
    }

    const { entityType, entityId, action } = classify(request.method, request.path);
    const userId = request.user.sub;
    const ipAddress = request.ip;
    const newValue = sanitize(request.body);

    return next.handle().pipe(
      tap(() => {
        void this.auditLogsService.write({ userId, action, entityType, entityId, ipAddress, newValue }).catch(() => {
          // Never let an audit-log write failure surface to the client - the request
          // already succeeded on its own terms.
        });
      }),
    );
  }
}
