import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { randomBytes } from 'node:crypto';
import * as QRCode from 'qrcode';
import { UserRole } from '../../common/enums/user-role.enum.js';

const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.POLICE_ADMIN, UserRole.POLICE_OFFICER];

export interface RequestingUser {
  sub: string;
  role: UserRole;
}

export interface PermitRow {
  id: string;
  applicationId: string;
  permissionNumber: string;
  qrToken: string;
  approvedRouteVersionId: string;
  approvedAt: string;
  issuedBy: string | null;
}

/** What the public-facing /public/verify/:token endpoint is allowed to reveal (F24 privacy rules). */
export interface PublicVerification {
  valid: boolean;
  permissionNumber: string;
  applicationNo: string;
  festivalName: string;
  eventTypeName: string;
  mandalName: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  approvedAt: string;
  policeStations: string[];
}

@Injectable()
export class PermitsService {
  constructor(private readonly dataSource: DataSource, private readonly config: ConfigService) {}

  /**
   * Called from ApprovalsService the moment an application's aggregate status
   * becomes APPROVED. Idempotent - if a permit somehow already exists for this
   * application (shouldn't happen since applications.status only reaches
   * APPROVED once per approval cycle, but resubmission-after-rejection edge
   * cases are cheap to guard against), it's returned as-is rather than erroring.
   */
  async issueForApplication(applicationId: string, issuedBy: string, manager = this.dataSource.manager): Promise<PermitRow> {
    const [existing] = await manager.query('SELECT id FROM permits WHERE application_id = $1', [applicationId]);
    if (existing) return this.findByApplicationRaw(applicationId, manager);

    const [app] = await manager.query(
      `SELECT a.application_no AS "applicationNo", a.active_route_id AS "activeRouteId"
       FROM applications a WHERE a.id = $1`,
      [applicationId],
    );
    if (!app?.activeRouteId) {
      throw new ConflictException('Cannot issue a permit for an application with no active route');
    }

    const permissionNumber = `PMT-${app.applicationNo}`;
    const qrToken = randomBytes(24).toString('base64url');

    await manager.query(
      `INSERT INTO permits (application_id, permission_number, qr_token, approved_route_version_id, issued_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [applicationId, permissionNumber, qrToken, app.activeRouteId, issuedBy],
    );

    return this.findByApplicationRaw(applicationId, manager);
  }

  private async findByApplicationRaw(applicationId: string, manager = this.dataSource.manager): Promise<PermitRow> {
    const [row] = await manager.query(
      `SELECT id, application_id AS "applicationId", permission_number AS "permissionNumber",
              qr_token AS "qrToken", approved_route_version_id AS "approvedRouteVersionId",
              approved_at AS "approvedAt", issued_by AS "issuedBy"
       FROM permits WHERE application_id = $1`,
      [applicationId],
    );
    if (!row) throw new NotFoundException('No permit has been issued for this application yet');
    return row;
  }

  async findByApplication(applicationId: string, user: RequestingUser): Promise<PermitRow> {
    if (!STAFF_ROLES.includes(user.role)) {
      const [app] = await this.dataSource.query('SELECT organizer_id AS "organizerId" FROM applications WHERE id = $1', [applicationId]);
      if (!app) throw new NotFoundException('Application not found');
      if (app.organizerId !== user.sub) throw new ForbiddenException('You do not have access to this application');
    }
    return this.findByApplicationRaw(applicationId);
  }

  async getQrCodePng(applicationId: string, user: RequestingUser): Promise<Buffer> {
    const permit = await this.findByApplication(applicationId, user);
    const verifyUrl = `${this.config.get<string>('frontendUrl')}/public/verify/${permit.qrToken}`;
    return QRCode.toBuffer(verifyUrl, { type: 'png', width: 400, margin: 2 });
  }

  /** Public, unauthenticated. Deliberately returns only what F24 says is safe to expose. */
  async verifyByToken(token: string): Promise<PublicVerification> {
    const [row] = await this.dataSource.query(
      `SELECT p.permission_number AS "permissionNumber", p.approved_at AS "approvedAt",
              a.application_no AS "applicationNo", a.mandal_name AS "mandalName", a.event_name AS "eventName",
              a.event_date AS "eventDate", a.start_time AS "startTime", a.end_time AS "endTime",
              f.name AS "festivalName", et.name AS "eventTypeName"
       FROM permits p
       JOIN applications a ON a.id = p.application_id
       JOIN festivals f ON f.id = a.festival_id
       JOIN event_types et ON et.id = a.event_type_id
       WHERE p.qr_token = $1`,
      [token],
    );
    if (!row) throw new NotFoundException('This permit could not be verified - the QR code or link may be invalid');

    const stations: { name: string }[] = await this.dataSource.query(
      `SELECT DISTINCT ps.name FROM application_approvals aa
       JOIN police_stations ps ON ps.id = aa.police_station_id
       JOIN permits p ON p.application_id = aa.application_id
       WHERE p.qr_token = $1 AND aa.decision = 'APPROVED'
       ORDER BY ps.name`,
      [token],
    );

    return { valid: true, ...row, policeStations: stations.map((s) => s.name) };
  }
}
