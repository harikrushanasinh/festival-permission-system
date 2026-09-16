import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ConflictSeverity, ConflictResolution } from './conflict-severity.enum.js';
import { ResolveConflictDto } from './dto/resolve-conflict.dto.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

export interface RequestingUser {
  sub: string;
  role: UserRole;
}

// Applications in these statuses are still "live" scheduling commitments -
// worth flagging a conflict against. DRAFT (not yet real), REJECTED, and
// COMPLETED (already happened) are excluded.
const ACTIVE_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'RESUBMITTED', 'APPROVED', 'LIVE'];
const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.POLICE_ADMIN, UserRole.POLICE_OFFICER];

export interface ConflictCandidate {
  conflictingApplicationId: string;
  overlapMeters: number;
}

@Injectable()
export class ConflictsService {
  constructor(private readonly dataSource: DataSource, private readonly config: ConfigService) {}

  private severityFor(overlapMeters: number): ConflictSeverity {
    const high = this.config.get<number>('conflicts.highSeverityOverlapMeters')!;
    const medium = this.config.get<number>('conflicts.mediumSeverityOverlapMeters')!;
    if (overlapMeters >= high) return ConflictSeverity.HIGH;
    if (overlapMeters >= medium) return ConflictSeverity.MEDIUM;
    return ConflictSeverity.LOW;
  }

  private async assertAccess(applicationId: string, user: RequestingUser): Promise<void> {
    if (STAFF_ROLES.includes(user.role)) return;
    const [app] = await this.dataSource.query('SELECT organizer_id AS "organizerId" FROM applications WHERE id = $1', [applicationId]);
    if (!app) throw new NotFoundException('Application not found');
    if (app.organizerId !== user.sub) throw new ForbiddenException('You do not have access to this application');
  }

  /**
   * B16 - same date -> time overlap -> route proximity -> severity. Only
   * applications with an already-calculated route path can be compared
   * spatially; date/time alone isn't enough to call it a route conflict.
   *
   * NOTE: the ST_Length/ST_Intersection expression is a per-row scalar, not
   * an aggregate - it's computed in a subquery and filtered with a plain
   * WHERE outside it, not HAVING (Postgres correctly rejects HAVING on a
   * non-aggregate expression with no GROUP BY: 42803).
   */
  async detectForApplication(applicationId: string, user: RequestingUser) {
    await this.assertAccess(applicationId, user);

    const [app] = await this.dataSource.query(
      `SELECT a.event_date AS "eventDate", a.start_time AS "startTime", a.end_time AS "endTime",
              a.active_route_id AS "activeRouteId", (rv.path IS NOT NULL) AS "hasPath"
       FROM applications a LEFT JOIN route_versions rv ON rv.id = a.active_route_id
       WHERE a.id = $1`,
      [applicationId],
    );
    if (!app) throw new NotFoundException('Application not found');
    if (!app.hasPath) {
      throw new BadRequestException('This application has no calculated route yet - cannot check for conflicts');
    }

    const bufferMeters = this.config.get<number>('conflicts.proximityBufferMeters')!;

    const candidates: ConflictCandidate[] = await this.dataSource.query(
      `SELECT * FROM (
         SELECT other.id AS "conflictingApplicationId",
                ROUND(ST_Length(
                  ST_Intersection(
                    mine.path::geometry,
                    ST_Buffer(other_rv.path, $3)::geometry
                  )::geography
                )::numeric, 2) AS "overlapMeters"
         FROM applications a
         JOIN route_versions mine ON mine.id = a.active_route_id
         JOIN applications other ON other.id != a.id
                                  AND other.event_date = a.event_date
                                  AND other.start_time < a.end_time AND other.end_time > a.start_time
                                  AND other.status = ANY($2)
         JOIN route_versions other_rv ON other_rv.id = other.active_route_id AND other_rv.path IS NOT NULL
         WHERE a.id = $1 AND a.status = ANY($2)
       ) candidates
       WHERE "overlapMeters" > 0`,
      [applicationId, ACTIVE_STATUSES, bufferMeters],
    );

    for (const candidate of candidates) {
      const severity = this.severityFor(candidate.overlapMeters);

      const [existing] = await this.dataSource.query(
        `SELECT id FROM route_conflicts
         WHERE (application_id = $1 AND conflicting_application_id = $2)
            OR (application_id = $2 AND conflicting_application_id = $1)`,
        [applicationId, candidate.conflictingApplicationId],
      );

      if (existing) {
        await this.dataSource.query(
          'UPDATE route_conflicts SET overlap_meters = $1, severity = $2 WHERE id = $3',
          [candidate.overlapMeters, severity, existing.id],
        );
      } else {
        await this.dataSource.query(
          `INSERT INTO route_conflicts (application_id, conflicting_application_id, overlap_meters, severity)
           VALUES ($1, $2, $3, $4)`,
          [applicationId, candidate.conflictingApplicationId, candidate.overlapMeters, severity],
        );
      }
    }

    return this.listForApplication(applicationId, user);
  }

  async listForApplication(applicationId: string, user: RequestingUser) {
    await this.assertAccess(applicationId, user);

    return this.dataSource.query(
      `SELECT rc.id, rc.overlap_meters AS "overlapMeters", rc.severity, rc.resolution,
              rc.resolved_at AS "resolvedAt", rc.detected_at AS "detectedAt",
              other.id AS "conflictingApplicationId", other.application_no AS "conflictingApplicationNo",
              other.mandal_name AS "conflictingMandalName", other.event_date AS "conflictingEventDate",
              other.start_time AS "conflictingStartTime", other.end_time AS "conflictingEndTime",
              f.name AS "conflictingFestivalName"
       FROM route_conflicts rc
       JOIN applications other ON other.id = CASE WHEN rc.application_id = $1 THEN rc.conflicting_application_id ELSE rc.application_id END
       JOIN festivals f ON f.id = other.festival_id
       WHERE rc.application_id = $1 OR rc.conflicting_application_id = $1
       ORDER BY rc.severity DESC, rc.detected_at DESC`,
      [applicationId],
    );
  }

  async resolve(conflictId: string, user: RequestingUser, dto: ResolveConflictDto): Promise<void> {
    const [rows] = await this.dataSource.query(
      'UPDATE route_conflicts SET resolution = $1, resolved_by = $2, resolved_at = now() WHERE id = $3 RETURNING id',
      [dto.resolution, user.sub, conflictId],
    );
    if (rows.length === 0) throw new NotFoundException('Conflict not found');
  }
}
