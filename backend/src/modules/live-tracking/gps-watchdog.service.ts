import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { LiveStatus } from './live-status.enum.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { LiveTrackingGateway } from './live-tracking.gateway.js';

/**
 * B21 - periodically checks every LIVE procession's last_update_at. No update
 * within gpsWarningSeconds -> GPS_WARNING; within gpsLostSeconds -> GPS_LOST.
 * Recovery (GPS_WARNING/GPS_LOST -> LIVE) happens the moment a fresh location
 * arrives - see LiveTrackingService.recordLocation - not here; this job only
 * ever moves things *toward* GPS_LOST, never back.
 */
@Injectable()
export class GpsWatchdogService {
  private readonly logger = new Logger(GpsWatchdogService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly gateway: LiveTrackingGateway,
  ) {}

  // The poll frequency itself is a fixed operational constant (how often we
  // check, not a business rule) - @Interval's argument is evaluated at class
  // definition time, before DI/ConfigService exists, so it can't read
  // GPS_WATCHDOG_INTERVAL_MS at runtime. The actual staleness thresholds
  // (gpsWarningSeconds/gpsLostSeconds) ARE read from config below, per call -
  // those are the numbers the spec means by "make it configurable."
  @Interval(10_000)
  async handleInterval(): Promise<void> {
    try {
      await this.checkStaleProcessions();
    } catch (err) {
      this.logger.error('GPS watchdog check failed', err as Error);
    }
  }

  private async findAlertRecipients(applicationId: string): Promise<string[]> {
    const assigned: { userId: string }[] = await this.dataSource.query(
      `SELECT DISTINCT po.user_id AS "userId"
       FROM application_police_stations aps
       JOIN police_officers po ON po.police_station_id = aps.police_station_id
       WHERE aps.application_id = $1 AND aps.is_confirmed = true`,
      [applicationId],
    );
    if (assigned.length > 0) return assigned.map((r) => r.userId);
    const admins: { id: string }[] = await this.dataSource.query("SELECT id FROM users WHERE role = 'POLICE_ADMIN' AND status = 'ACTIVE'");
    return admins.map((r) => r.id);
  }

  async checkStaleProcessions(): Promise<void> {
    const warningSeconds = this.config.get<number>('liveTracking.gpsWarningSeconds')!;
    const lostSeconds = this.config.get<number>('liveTracking.gpsLostSeconds')!;

    const [toLost]: [{ id: string; applicationId: string }[], number] = await this.dataSource.query(
      `UPDATE live_processions SET status = $1
       WHERE status IN ($2, $3) AND last_update_at < now() - ($4 || ' seconds')::interval
       RETURNING id, application_id AS "applicationId"`,
      [LiveStatus.GPS_LOST, LiveStatus.LIVE, LiveStatus.GPS_WARNING, lostSeconds],
    );
    for (const row of toLost) {
      await this.alert(row.applicationId, 'GPS_LOST', 'GPS signal lost', 'No location update received for an extended period.');
    }

    const [toWarning]: [{ id: string; applicationId: string }[], number] = await this.dataSource.query(
      `UPDATE live_processions SET status = $1
       WHERE status = $2 AND last_update_at < now() - ($3 || ' seconds')::interval
       RETURNING id, application_id AS "applicationId"`,
      [LiveStatus.GPS_WARNING, LiveStatus.LIVE, warningSeconds],
    );
    for (const row of toWarning) {
      await this.alert(row.applicationId, 'GPS_WARNING', 'GPS signal weak', 'No location update received recently.');
    }
  }

  private async alert(applicationId: string, eventCode: string, title: string, body: string): Promise<void> {
    const recipients = await this.findAlertRecipients(applicationId);
    await this.notifications.createForUsers(recipients, { eventCode, title, body, relatedApplicationId: applicationId });
    this.gateway.server?.to(`application:${applicationId}`).emit('status:broadcast', { applicationId, status: eventCode });
    this.gateway.server?.to('admin-live').emit('status:broadcast', { applicationId, status: eventCode });
  }
}
