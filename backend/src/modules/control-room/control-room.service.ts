import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QueryControlRoomDto } from './dto/query-control-room.dto.js';

// Statuses shown by default when no explicit status filter is given - the
// ones actually relevant to a control room ("what's happening right now"),
// as opposed to processions that haven't started or have already wrapped up.
const DEFAULT_ACTIVE_STATUSES = ['LIVE', 'GPS_WARNING', 'GPS_LOST'];

@Injectable()
export class ControlRoomService {
  constructor(private readonly dataSource: DataSource) {}

  async listLive(query: QueryControlRoomDto) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (query.status) {
      conditions.push(`lp.status = $${i++}`); params.push(query.status);
    } else {
      conditions.push(`lp.status = ANY($${i++})`); params.push(DEFAULT_ACTIVE_STATUSES);
    }
    if (query.deviationStatus) { conditions.push(`lp.deviation_status = $${i++}`); params.push(query.deviationStatus); }
    if (query.festivalId) { conditions.push(`a.festival_id = $${i++}`); params.push(query.festivalId); }
    if (query.eventTypeId) { conditions.push(`a.event_type_id = $${i++}`); params.push(query.eventTypeId); }

    const stationId = query.policeStationId ?? null;
    const areaId = query.areaId ?? null;
    if (stationId || areaId) {
      conditions.push(
        `EXISTS (SELECT 1 FROM application_police_stations aps
                 WHERE aps.application_id = a.id AND aps.is_confirmed = true
                 AND aps.police_station_id = COALESCE($${i}::uuid, (SELECT police_station_id FROM areas WHERE id = $${i + 1}::uuid)))`,
      );
      params.push(stationId, areaId);
      i += 2;
    }

    const whereClause = conditions.length ? conditions.join(' AND ') : 'true';

    return this.dataSource.query(
      `SELECT a.id AS "applicationId", a.application_no AS "applicationNo", a.mandal_name AS "mandalName",
              f.name AS "festivalName", et.name AS "eventTypeName",
              lp.status, lp.deviation_status AS "deviationStatus",
              lp.last_latitude AS "lastLatitude", lp.last_longitude AS "lastLongitude", lp.last_update_at AS "lastUpdateAt"
       FROM live_processions lp
       JOIN applications a ON a.id = lp.application_id
       JOIN festivals f ON f.id = a.festival_id
       JOIN event_types et ON et.id = a.event_type_id
       WHERE ${whereClause}
       ORDER BY lp.last_update_at DESC NULLS LAST`,
      params,
    );
  }

  async getDetail(applicationId: string) {
    const [row] = await this.dataSource.query(
      `SELECT a.id AS "applicationId", a.application_no AS "applicationNo", a.mandal_name AS "mandalName",
              a.event_name AS "eventName", f.name AS "festivalName", et.name AS "eventTypeName",
              lp.status, lp.deviation_status AS "deviationStatus",
              lp.last_latitude AS "lastLatitude", lp.last_longitude AS "lastLongitude", lp.last_update_at AS "lastUpdateAt",
              rv.id AS "routeVersionId", ST_AsGeoJSON(rv.path)::json AS "routePath"
       FROM live_processions lp
       JOIN applications a ON a.id = lp.application_id
       JOIN festivals f ON f.id = a.festival_id
       JOIN event_types et ON et.id = a.event_type_id
       LEFT JOIN route_versions rv ON rv.id = a.active_route_id
       WHERE lp.application_id = $1`,
      [applicationId],
    );
    if (!row) throw new NotFoundException('No live procession found for this application');

    const [latest] = await this.dataSource.query(
      `SELECT speed, heading, accuracy, distance_from_route_m AS "distanceFromRouteM", recorded_at AS "recordedAt"
       FROM live_locations
       WHERE live_procession_id = (SELECT id FROM live_processions WHERE application_id = $1)
       ORDER BY recorded_at DESC LIMIT 1`,
      [applicationId],
    );

    const stations: { name: string }[] = await this.dataSource.query(
      `SELECT DISTINCT ps.name FROM application_police_stations aps
       JOIN police_stations ps ON ps.id = aps.police_station_id
       WHERE aps.application_id = $1 AND aps.is_confirmed = true`,
      [applicationId],
    );

    return { ...row, policeStations: stations.map((s) => s.name), latest: latest ?? null };
  }
}
