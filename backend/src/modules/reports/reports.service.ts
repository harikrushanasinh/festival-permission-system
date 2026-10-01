import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReportFilterDto } from './dto/report-filter.dto.js';

interface ScopedWhere {
  clause: string;
  params: unknown[];
}

/** Builds the shared `a.event_date` / festival / event-type scoping used by every report. */
function scopeApplications(filters: ReportFilterDto, alias = 'a'): ScopedWhere {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.from) {
    params.push(filters.from);
    conditions.push(`${alias}.event_date >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`${alias}.event_date <= $${params.length}`);
  }
  if (filters.festivalId) {
    params.push(filters.festivalId);
    conditions.push(`${alias}.festival_id = $${params.length}`);
  }
  if (filters.eventTypeId) {
    params.push(filters.eventTypeId);
    conditions.push(`${alias}.event_type_id = $${params.length}`);
  }

  return { clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  /** B23 - Total applications, broken down by status, within the given scope. */
  async summary(filters: ReportFilterDto) {
    const { clause, params } = scopeApplications(filters);
    const [byStatus, totalRows] = await Promise.all([
      this.dataSource.query(
        `SELECT status, count(*)::int AS count FROM applications a ${clause} GROUP BY status`,
        params,
      ),
      this.dataSource.query(`SELECT count(*)::int AS count FROM applications a ${clause}`, params),
    ]);
    return {
      total: totalRows[0].count,
      byStatus: Object.fromEntries(byStatus.map((row: { status: string; count: number }) => [row.status, row.count])),
    };
  }

  /** B23 - Festival-wise totals. */
  async byFestival(filters: ReportFilterDto) {
    const { clause, params } = scopeApplications(filters);
    return this.dataSource.query(
      `SELECT f.id AS "festivalId", f.name AS "festivalName", count(a.id)::int AS count
       FROM festivals f
       LEFT JOIN applications a ON a.festival_id = f.id
       ${clause.replace('WHERE', 'AND')}
       GROUP BY f.id, f.name
       ORDER BY f.display_order`,
      params,
    );
  }

  /** B23 - Aagman/Visarjan (event-type) totals. */
  async byEventType(filters: ReportFilterDto) {
    const { clause, params } = scopeApplications(filters);
    return this.dataSource.query(
      `SELECT et.id AS "eventTypeId", et.name AS "eventTypeName", count(a.id)::int AS count
       FROM event_types et
       LEFT JOIN applications a ON a.event_type_id = et.id
       ${clause.replace('WHERE', 'AND')}
       GROUP BY et.id, et.name
       ORDER BY et.name`,
      params,
    );
  }

  /**
   * B23 - Area-wise totals. Applications don't carry an area directly; an application
   * reaches an area through the police station it was confirmed against (F11/F12), and
   * a station's area is the one whose jurisdiction polygon names it as the responsible
   * station (B07).
   */
  async byArea(filters: ReportFilterDto) {
    const { clause, params } = scopeApplications(filters, 'a');
    return this.dataSource.query(
      `SELECT ar.id AS "areaId", ar.name AS "areaName", count(DISTINCT a.id)::int AS count
       FROM areas ar
       LEFT JOIN application_police_stations aps
         ON aps.police_station_id = ar.police_station_id AND aps.is_confirmed = true
       LEFT JOIN applications a ON a.id = aps.application_id
       ${clause.replace('WHERE', 'AND')}
       GROUP BY ar.id, ar.name
       ORDER BY ar.name`,
      params,
    );
  }

  /** B23 - Police-station-wise totals, counting an application once per confirmed station. */
  async byPoliceStation(filters: ReportFilterDto) {
    const { clause, params } = scopeApplications(filters, 'a');
    return this.dataSource.query(
      `SELECT ps.id AS "policeStationId", ps.name AS "policeStationName", count(DISTINCT a.id)::int AS count
       FROM police_stations ps
       LEFT JOIN application_police_stations aps
         ON aps.police_station_id = ps.id AND aps.is_confirmed = true
       LEFT JOIN applications a ON a.id = aps.application_id
       ${clause.replace('WHERE', 'AND')}
       GROUP BY ps.id, ps.name
       ORDER BY ps.name`,
      params,
    );
  }

  /** B23 - Conflict counts by severity and by how they were resolved. */
  async conflicts(filters: ReportFilterDto) {
    const { clause, params } = scopeApplications(filters, 'a');
    const [bySeverity, byResolution] = await Promise.all([
      this.dataSource.query(
        `SELECT rc.severity, count(*)::int AS count
         FROM route_conflicts rc JOIN applications a ON a.id = rc.application_id
         ${clause} GROUP BY rc.severity`,
        params,
      ),
      this.dataSource.query(
        `SELECT rc.resolution, count(*)::int AS count
         FROM route_conflicts rc JOIN applications a ON a.id = rc.application_id
         ${clause} GROUP BY rc.resolution`,
        params,
      ),
    ]);
    return {
      bySeverity: Object.fromEntries(bySeverity.map((r: { severity: string; count: number }) => [r.severity, r.count])),
      byResolution: Object.fromEntries(byResolution.map((r: { resolution: string; count: number }) => [r.resolution, r.count])),
    };
  }

  /** B23 - How often live processions ran clean vs triggered a deviation/GPS-lost alert. */
  async deviations(filters: ReportFilterDto) {
    const { clause, params } = scopeApplications(filters, 'a');
    const byStatus = await this.dataSource.query(
      `SELECT lp.deviation_status AS "deviationStatus", count(*)::int AS count
       FROM live_processions lp JOIN applications a ON a.id = lp.application_id
       ${clause} GROUP BY lp.deviation_status`,
      params,
    );
    return {
      byDeviationStatus: Object.fromEntries(
        byStatus.map((r: { deviationStatus: string; count: number }) => [r.deviationStatus, r.count]),
      ),
    };
  }

  /** Row data behind the CSV export - one row per application in scope. */
  async applicationRows(filters: ReportFilterDto) {
    const { clause, params } = scopeApplications(filters, 'a');
    return this.dataSource.query(
      `SELECT a.application_no AS "applicationNo", a.mandal_name AS "mandalName", f.name AS "festivalName",
              et.name AS "eventTypeName", a.event_date AS "eventDate", a.start_time AS "startTime",
              a.end_time AS "endTime", a.status, a.expected_crowd AS "expectedCrowd",
              a.vehicle_count AS "vehicleCount", a.created_at AS "createdAt"
       FROM applications a
       JOIN festivals f ON f.id = a.festival_id
       JOIN event_types et ON et.id = a.event_type_id
       ${clause}
       ORDER BY a.event_date DESC`,
      params,
    );
  }
}
