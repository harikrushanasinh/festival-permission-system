import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QueryPublicProcessionsDto } from './dto/query-public-processions.dto.js';

// Only these statuses are ever shown on the public portal (F23) - draft,
// submitted, under-review, changes-requested, and rejected applications stay
// entirely private to the organizer/police.
const PUBLIC_STATUSES = ['APPROVED', 'LIVE', 'COMPLETED'];

@Injectable()
export class PublicService {
  constructor(private readonly dataSource: DataSource) {}

  async listProcessions(query: QueryPublicProcessionsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (query.timeframe === 'live') {
      conditions.push(`a.status = $${i++}`); params.push('LIVE');
    } else if (query.timeframe === 'completed') {
      conditions.push(`a.status = $${i++}`); params.push('COMPLETED');
    } else if (query.timeframe === 'upcoming') {
      conditions.push(`a.status = $${i++} AND a.event_date >= CURRENT_DATE`); params.push('APPROVED');
    } else {
      conditions.push(`a.status = ANY($${i++})`); params.push(PUBLIC_STATUSES);
    }

    if (query.festivalId) { conditions.push(`a.festival_id = $${i++}`); params.push(query.festivalId); }
    if (query.eventTypeId) { conditions.push(`a.event_type_id = $${i++}`); params.push(query.eventTypeId); }
    if (query.date) { conditions.push(`a.event_date = $${i++}`); params.push(query.date); }
    if (query.policeStationId) {
      conditions.push(
        `EXISTS (SELECT 1 FROM application_police_stations aps
                 WHERE aps.application_id = a.id AND aps.is_confirmed = true AND aps.police_station_id = $${i++})`,
      );
      params.push(query.policeStationId);
    }

    const whereClause = conditions.join(' AND ');

    const [{ total }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM applications a WHERE ${whereClause}`,
      params,
    );

    const items = await this.dataSource.query(
      `SELECT a.id, a.application_no AS "applicationNo", a.mandal_name AS "mandalName", a.event_name AS "eventName",
              a.event_date AS "eventDate", a.start_time AS "startTime", a.end_time AS "endTime", a.status,
              f.name AS "festivalName", et.name AS "eventTypeName",
              rv.start_address AS "startAddress", rv.destination_address AS "destinationAddress"
       FROM applications a
       JOIN festivals f ON f.id = a.festival_id
       JOIN event_types et ON et.id = a.event_type_id
       LEFT JOIN route_versions rv ON rv.id = a.active_route_id
       WHERE ${whereClause}
       ORDER BY a.event_date ASC, a.start_time ASC
       LIMIT $${i++} OFFSET $${i++}`,
      [...params, pageSize, (page - 1) * pageSize],
    );

    return { items, total, page, pageSize };
  }

  async getProcession(id: string) {
    const [app] = await this.dataSource.query(
      `SELECT a.id, a.application_no AS "applicationNo", a.mandal_name AS "mandalName", a.event_name AS "eventName",
              a.event_date AS "eventDate", a.start_time AS "startTime", a.end_time AS "endTime", a.status,
              a.expected_crowd AS "expectedCrowd",
              f.name AS "festivalName", et.name AS "eventTypeName",
              rv.id AS "routeVersionId", rv.start_address AS "startAddress", rv.destination_address AS "destinationAddress",
              rv.distance_meters AS "distanceMeters", rv.duration_seconds AS "durationSeconds",
              ST_AsGeoJSON(rv.path)::json AS "routePath"
       FROM applications a
       JOIN festivals f ON f.id = a.festival_id
       JOIN event_types et ON et.id = a.event_type_id
       LEFT JOIN route_versions rv ON rv.id = a.active_route_id
       WHERE a.id = $1 AND a.status = ANY($2)`,
      [id, PUBLIC_STATUSES],
    );
    if (!app) throw new NotFoundException('This procession is not publicly listed');

    const stations: { name: string }[] = await this.dataSource.query(
      `SELECT DISTINCT ps.name FROM application_police_stations aps
       JOIN police_stations ps ON ps.id = aps.police_station_id
       WHERE aps.application_id = $1 AND aps.is_confirmed = true`,
      [id],
    );

    const points = app.routeVersionId
      ? await this.dataSource.query(
          `SELECT sequence_no AS "sequenceNo", point_type AS "pointType", address,
                  ST_AsGeoJSON(location)::json AS location
           FROM route_points WHERE route_version_id = $1 ORDER BY sequence_no`,
          [app.routeVersionId],
        )
      : [];

    const [permit] = await this.dataSource.query('SELECT permission_number AS "permissionNumber" FROM permits WHERE application_id = $1', [id]);

    return { ...app, policeStations: stations.map((s) => s.name), routePoints: points, permissionNumber: permit?.permissionNumber ?? null };
  }
}
