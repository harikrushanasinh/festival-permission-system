import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants.js';
import { RecordLocationDto } from './dto/record-location.dto.js';
import { LiveStatus } from './live-status.enum.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

export interface RequestingUser {
  sub: string;
  role: UserRole;
}

export interface LocationBroadcast {
  applicationId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  distanceFromRouteM: number | null;
  deviationStatus: 'NORMAL' | 'WARNING' | 'DEVIATION';
  recordedAt: string;
}

const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.POLICE_ADMIN, UserRole.POLICE_OFFICER];
const redisKey = (applicationId: string) => `live:${applicationId}`;

@Injectable()
export class LiveTrackingService {
  constructor(private readonly dataSource: DataSource, @Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private async assertOwner(applicationId: string, user: RequestingUser): Promise<void> {
    const [app] = await this.dataSource.query('SELECT organizer_id AS "organizerId" FROM applications WHERE id = $1', [applicationId]);
    if (!app) throw new NotFoundException('Application not found');
    if (app.organizerId !== user.sub) throw new ForbiddenException('Only the owning organizer can control this procession');
  }

  /** F21/B19 - starts a procession. Requires the application to be APPROVED with an active route. */
  async start(applicationId: string, user: RequestingUser): Promise<{ liveProcessionId: string }> {
    await this.assertOwner(applicationId, user);

    const [app] = await this.dataSource.query(
      'SELECT status, active_route_id AS "activeRouteId" FROM applications WHERE id = $1',
      [applicationId],
    );
    if (app.status !== 'APPROVED') {
      throw new BadRequestException(`Cannot start a procession while the application status is ${app.status} - it must be APPROVED`);
    }
    if (!app.activeRouteId) {
      throw new BadRequestException('This application has no approved route');
    }

    return this.dataSource.transaction(async (manager) => {
      const [existing] = await manager.query('SELECT id, status FROM live_processions WHERE application_id = $1', [applicationId]);

      let liveProcessionId: string;
      if (existing) {
        if (existing.status === LiveStatus.LIVE) {
          throw new BadRequestException('This procession is already live');
        }
        await manager.query(
          `UPDATE live_processions SET status = $1, started_at = now(), ended_at = NULL WHERE id = $2`,
          [LiveStatus.LIVE, existing.id],
        );
        liveProcessionId = existing.id;
      } else {
        const [created] = await manager.query(
          `INSERT INTO live_processions (application_id, status, started_at) VALUES ($1, $2, now()) RETURNING id`,
          [applicationId, LiveStatus.LIVE],
        );
        liveProcessionId = created.id;
      }

      await manager.query('UPDATE applications SET status = $1, updated_at = now() WHERE id = $2', ['LIVE', applicationId]);
      await manager.query(
        `INSERT INTO application_status_history (application_id, from_status, to_status, changed_by)
         VALUES ($1, $2, $3, $4)`,
        [applicationId, app.status, 'LIVE', user.sub],
      );

      return { liveProcessionId };
    });
  }

  async complete(applicationId: string, user: RequestingUser): Promise<void> {
    if (!STAFF_ROLES.includes(user.role)) await this.assertOwner(applicationId, user);

    const [live] = await this.dataSource.query('SELECT id, status FROM live_processions WHERE application_id = $1', [applicationId]);
    if (!live || live.status !== LiveStatus.LIVE) {
      throw new BadRequestException('This procession is not currently live');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.query('UPDATE live_processions SET status = $1, ended_at = now() WHERE id = $2', [LiveStatus.COMPLETED, live.id]);
      await manager.query('UPDATE applications SET status = $1, updated_at = now() WHERE id = $2', ['COMPLETED', applicationId]);
      await manager.query(
        `INSERT INTO application_status_history (application_id, from_status, to_status, changed_by)
         VALUES ($1, 'LIVE', 'COMPLETED', $2)`,
        [applicationId, user.sub],
      );
    });
    await this.redis.del(redisKey(applicationId));
  }

  /**
   * Ingests one GPS point (B19/B20). Persists to Postgres (the durable history
   * - live_locations) and Redis (the ephemeral "where is it right now" cache
   * that Socket.IO broadcasts read from - never the other way around, per the
   * spec's explicit "do not use Redis as the permanent GPS history" rule).
   * Returns the broadcast-ready payload including a first-pass deviation
   * calculation against the approved route geometry.
   */
  async recordLocation(applicationId: string, user: RequestingUser, dto: RecordLocationDto): Promise<LocationBroadcast> {
    await this.assertOwner(applicationId, user);

    const [live] = await this.dataSource.query(
      `SELECT lp.id, lp.status, a.active_route_id AS "activeRouteId"
       FROM live_processions lp JOIN applications a ON a.id = lp.application_id
       WHERE lp.application_id = $1`,
      [applicationId],
    );
    if (!live || live.status !== LiveStatus.LIVE) {
      throw new BadRequestException('This procession is not currently live - call start first');
    }

    const recordedAt = dto.timestamp ?? new Date().toISOString();

    const [{ distanceFromRouteM }] = await this.dataSource.query(
      `SELECT ST_Distance(
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                (SELECT path FROM route_versions WHERE id = $3)
              ) AS "distanceFromRouteM"`,
      [dto.longitude, dto.latitude, live.activeRouteId],
    );

    // Thresholds match the spec's example bands; configurable later rather
    // than hardcoded permanently (B20 will own this properly).
    const distance = Number(distanceFromRouteM);
    const deviationStatus: LocationBroadcast['deviationStatus'] = distance > 100 ? 'DEVIATION' : distance > 50 ? 'WARNING' : 'NORMAL';

    await this.dataSource.query(
      `INSERT INTO live_locations (live_procession_id, latitude, longitude, location, speed, heading, accuracy, distance_from_route_m, recorded_at)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, $7, $8, $9, $10)`,
      [live.id, dto.latitude, dto.longitude, dto.longitude, dto.latitude, dto.speed ?? null, dto.heading ?? null, dto.accuracy ?? null, distance, recordedAt],
    );

    await this.dataSource.query(
      `UPDATE live_processions
       SET last_latitude = $1, last_longitude = $2, last_location = ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
           last_update_at = now(), deviation_status = $3
       WHERE id = $4`,
      [dto.latitude, dto.longitude, deviationStatus, live.id],
    );

    const broadcast: LocationBroadcast = {
      applicationId, latitude: dto.latitude, longitude: dto.longitude,
      speed: dto.speed ?? null, heading: dto.heading ?? null, accuracy: dto.accuracy ?? null,
      distanceFromRouteM: distance, deviationStatus, recordedAt,
    };
    await this.redis.set(redisKey(applicationId), JSON.stringify(broadcast));

    return broadcast;
  }

  /** Reads the fast Redis cache first; falls back to Postgres if the cache is cold. */
  async getCurrentLocation(applicationId: string): Promise<LocationBroadcast | null> {
    const cached = await this.redis.get(redisKey(applicationId));
    if (cached) return JSON.parse(cached) as LocationBroadcast;

    const [row] = await this.dataSource.query(
      `SELECT lp.application_id AS "applicationId", lp.last_latitude AS "latitude", lp.last_longitude AS "longitude",
              lp.deviation_status AS "deviationStatus", lp.last_update_at AS "recordedAt"
       FROM live_processions lp WHERE lp.application_id = $1 AND lp.status = 'LIVE'`,
      [applicationId],
    );
    if (!row || row.latitude === null) return null;
    return { ...row, speed: null, heading: null, accuracy: null, distanceFromRouteM: null };
  }
}
