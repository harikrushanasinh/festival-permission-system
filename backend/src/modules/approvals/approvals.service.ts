import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ApprovalDecision } from './approval-decision.enum.js';
import { DecideApprovalDto } from './dto/decide-approval.dto.js';
import { ApplicationStatus } from '../applications/application-status.enum.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { PermitsService } from '../permits/permits.service.js';

export interface RequestingUser {
  sub: string;
  role: UserRole;
}

export interface ApprovalRow {
  id: string;
  policeStationId: string;
  policeStationName: string;
  policeStationCode: string;
  decision: ApprovalDecision;
  reason: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
}

const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.POLICE_ADMIN, UserRole.POLICE_OFFICER];

@Injectable()
export class ApprovalsService {
  constructor(private readonly dataSource: DataSource, private readonly permitsService: PermitsService) {}

  private async assertApplicationAccess(applicationId: string, user: RequestingUser): Promise<void> {
    if (STAFF_ROLES.includes(user.role)) return;
    const [app] = await this.dataSource.query('SELECT organizer_id AS "organizerId" FROM applications WHERE id = $1', [applicationId]);
    if (!app) throw new NotFoundException('Application not found');
    if (app.organizerId !== user.sub) throw new ForbiddenException('You do not have access to this application');
  }

  async listForApplication(applicationId: string, user: RequestingUser): Promise<ApprovalRow[]> {
    await this.assertApplicationAccess(applicationId, user);
    return this.dataSource.query(
      `SELECT aa.id, ps.id AS "policeStationId", ps.name AS "policeStationName", ps.code AS "policeStationCode",
              aa.decision, aa.reason, aa.decided_by AS "decidedBy", aa.decided_at AS "decidedAt"
       FROM application_approvals aa
       JOIN police_stations ps ON ps.id = aa.police_station_id
       WHERE aa.application_id = $1
       ORDER BY ps.name`,
      [applicationId],
    );
  }

  /**
   * Records one station's decision (F17) and recomputes the application's
   * overall status (F18/B14): any REJECTED wins outright, any
   * CHANGES_REQUESTED sends it back to the organizer, all APPROVED closes it
   * out, otherwise it stays UNDER_REVIEW while stations are still deciding.
   */
  async decide(applicationId: string, stationId: string, user: RequestingUser, dto: DecideApprovalDto): Promise<ApprovalRow> {
    if (dto.decision !== ApprovalDecision.APPROVED && !dto.reason) {
      throw new BadRequestException(`A reason is required when the decision is ${dto.decision}`);
    }

    return this.dataSource.transaction(async (manager) => {
      const [existing] = await manager.query(
        'SELECT id FROM application_approvals WHERE application_id = $1 AND police_station_id = $2 FOR UPDATE',
        [applicationId, stationId],
      );
      if (!existing) {
        throw new NotFoundException('This station is not on the approval list for this application - confirm it as a suggestion first');
      }

      await manager.query(
        `UPDATE application_approvals
         SET decision = $1, reason = $2, decided_by = $3, decided_at = now()
         WHERE application_id = $4 AND police_station_id = $5`,
        [dto.decision, dto.reason ?? null, user.sub, applicationId, stationId],
      );

      const allDecisions: { decision: ApprovalDecision }[] = await manager.query(
        'SELECT decision FROM application_approvals WHERE application_id = $1',
        [applicationId],
      );

      let newStatus: ApplicationStatus;
      if (allDecisions.some((d) => d.decision === ApprovalDecision.REJECTED)) {
        newStatus = ApplicationStatus.REJECTED;
      } else if (allDecisions.some((d) => d.decision === ApprovalDecision.CHANGES_REQUESTED)) {
        newStatus = ApplicationStatus.CHANGES_REQUESTED;
      } else if (allDecisions.every((d) => d.decision === ApprovalDecision.APPROVED)) {
        newStatus = ApplicationStatus.APPROVED;
      } else {
        newStatus = ApplicationStatus.UNDER_REVIEW;
      }

      const [app] = await manager.query('SELECT status FROM applications WHERE id = $1', [applicationId]);
      if (app.status !== newStatus) {
        await manager.query('UPDATE applications SET status = $1, updated_at = now() WHERE id = $2', [newStatus, applicationId]);
        await manager.query(
          `INSERT INTO application_status_history (application_id, from_status, to_status, reason, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [applicationId, app.status, newStatus, dto.reason ?? null, user.sub],
        );

        // B15/F20 - the permit is issued the moment the aggregate status
        // actually reaches APPROVED, inside the same transaction so a permit
        // never exists without its approval being durably committed (and
        // vice versa - if permit issuance failed, the whole decision rolls back).
        if (newStatus === ApplicationStatus.APPROVED) {
          await this.permitsService.issueForApplication(applicationId, user.sub, manager);
        }
      }

      const [row] = await manager.query(
        `SELECT aa.id, ps.id AS "policeStationId", ps.name AS "policeStationName", ps.code AS "policeStationCode",
                aa.decision, aa.reason, aa.decided_by AS "decidedBy", aa.decided_at AS "decidedAt"
         FROM application_approvals aa
         JOIN police_stations ps ON ps.id = aa.police_station_id
         WHERE aa.application_id = $1 AND aa.police_station_id = $2`,
        [applicationId, stationId],
      );
      return row;
    });
  }
}
