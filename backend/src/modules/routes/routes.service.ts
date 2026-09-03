import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { LineString, Point } from 'geojson';
import { CreateRouteVersionDto } from './dto/create-route-version.dto.js';
import { LocationPointDto } from './dto/location-point.dto.js';
import { RouteVersionStatus } from './route-version-status.enum.js';

// Placeholder average procession walking speed, used only to give a rough
// duration estimate until Module 07's real Google Directions integration
// (which returns actual travel time) replaces this. Distance is real PostGIS
// geography math either way, not a placeholder.
const AVG_PROCESSION_SPEED_MPS = 1.11; // ~4 km/h

export interface RouteVersionResult {
  id: string;
  routeId: string;
  versionNumber: number;
  status: RouteVersionStatus;
  startAddress: string;
  destinationAddress: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  changeReason: string | null;
  createdAt: string;
  path: LineString | null;
  points: { sequenceNo: number; pointType: string; address: string | null; location: Point }[];
}

@Injectable()
export class RoutesService {
  constructor(private readonly dataSource: DataSource) {}

  private async findOrCreateRoute(applicationId: string): Promise<string> {
    const existing: { id: string }[] = await this.dataSource.query(
      'SELECT id FROM routes WHERE application_id = $1',
      [applicationId],
    );
    if (existing[0]) return existing[0].id;

    const app: { id: string }[] = await this.dataSource.query('SELECT id FROM applications WHERE id = $1', [applicationId]);
    if (!app[0]) throw new NotFoundException('Application not found');

    const created: { id: string }[] = await this.dataSource.query(
      'INSERT INTO routes (application_id) VALUES ($1) RETURNING id',
      [applicationId],
    );
    return created[0].id;
  }

  async createVersion(applicationId: string, userId: string, dto: CreateRouteVersionDto): Promise<RouteVersionResult> {
    const routeId = await this.findOrCreateRoute(applicationId);

    const { versionNumber } = (
      await this.dataSource.query(
        'SELECT COALESCE(MAX(version_number), 0) + 1 AS "versionNumber" FROM route_versions WHERE route_id = $1',
        [routeId],
      )
    )[0] as { versionNumber: number };

    const [versionRow] = await this.dataSource.query(
      `INSERT INTO route_versions
         (route_id, version_number, status, start_address, start_place_id, start_point,
          destination_address, destination_place_id, destination_point, change_reason, created_by)
       VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography,
               $8, $9, ST_SetSRID(ST_MakePoint($10, $11), 4326)::geography, $12, $13)
       RETURNING id`,
      [
        routeId, versionNumber, RouteVersionStatus.DRAFT,
        dto.start.address, dto.start.placeId ?? null, dto.start.lng, dto.start.lat,
        dto.destination.address, dto.destination.placeId ?? null, dto.destination.lng, dto.destination.lat,
        dto.changeReason ?? null, userId,
      ],
    );
    const routeVersionId = versionRow.id as string;

    const points: LocationPointDto[] = [dto.start, ...(dto.points ?? []), dto.destination];
    const pointTypes = ['START', ...(dto.points ?? []).map(() => 'WAYPOINT'), 'DESTINATION'];

    for (let i = 0; i < points.length; i++) {
      await this.dataSource.query(
        `INSERT INTO route_points (route_version_id, sequence_no, point_type, address, place_id, location)
         VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography)`,
        [routeVersionId, i, pointTypes[i], points[i].address, points[i].placeId ?? null, points[i].lng, points[i].lat],
      );
    }

    // The newest version becomes what the organizer/police are working against.
    await this.dataSource.query('UPDATE applications SET active_route_id = $1 WHERE id = $2', [routeVersionId, applicationId]);

    return this.findOne(routeVersionId);
  }

  /** Builds the path geometry from the ordered points and computes real PostGIS distance. */
  async calculate(routeVersionId: string): Promise<RouteVersionResult> {
    const pointCount: { count: string }[] = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM route_points WHERE route_version_id = $1',
      [routeVersionId],
    );
    if (parseInt(pointCount[0].count, 10) < 2) {
      throw new BadRequestException('At least a start and destination point are required to calculate a route');
    }

    await this.dataSource.query(
      `UPDATE route_versions rv
       SET path = sub.path, distance_meters = ST_Length(sub.path)
       FROM (
         SELECT ST_MakeLine(
                  ARRAY(SELECT location::geometry FROM route_points
                        WHERE route_version_id = $1 ORDER BY sequence_no)
                )::geography AS path
       ) sub
       WHERE rv.id = $1`,
      [routeVersionId],
    );

    const [{ distanceMeters }] = await this.dataSource.query(
      'SELECT distance_meters AS "distanceMeters" FROM route_versions WHERE id = $1',
      [routeVersionId],
    );
    const durationSeconds = Math.round(Number(distanceMeters) / AVG_PROCESSION_SPEED_MPS);

    await this.dataSource.query('UPDATE route_versions SET duration_seconds = $1 WHERE id = $2', [durationSeconds, routeVersionId]);

    return this.findOne(routeVersionId);
  }

  async findOne(routeVersionId: string): Promise<RouteVersionResult> {
    const rows = await this.dataSource.query(
      `SELECT id, route_id AS "routeId", version_number AS "versionNumber", status,
              start_address AS "startAddress", destination_address AS "destinationAddress",
              distance_meters AS "distanceMeters", duration_seconds AS "durationSeconds",
              change_reason AS "changeReason", created_at AS "createdAt",
              ST_AsGeoJSON(path)::json AS path
       FROM route_versions WHERE id = $1`,
      [routeVersionId],
    );
    if (!rows[0]) throw new NotFoundException('Route version not found');

    const points = await this.dataSource.query(
      `SELECT sequence_no AS "sequenceNo", point_type AS "pointType", address,
              ST_AsGeoJSON(location)::json AS location
       FROM route_points WHERE route_version_id = $1 ORDER BY sequence_no`,
      [routeVersionId],
    );

    return { ...rows[0], points };
  }

  async findByApplication(applicationId: string): Promise<RouteVersionResult[]> {
    const versions: { id: string }[] = await this.dataSource.query(
      `SELECT rv.id FROM route_versions rv
       JOIN routes r ON r.id = rv.route_id
       WHERE r.application_id = $1
       ORDER BY rv.version_number ASC`,
      [applicationId],
    );
    return Promise.all(versions.map((v) => this.findOne(v.id)));
  }

  async getActiveForApplication(applicationId: string): Promise<RouteVersionResult> {
    const [app] = await this.dataSource.query('SELECT active_route_id AS "activeRouteId" FROM applications WHERE id = $1', [applicationId]);
    if (!app) throw new NotFoundException('Application not found');
    if (!app.activeRouteId) throw new NotFoundException('This application has no route yet');
    return this.findOne(app.activeRouteId);
  }
}
