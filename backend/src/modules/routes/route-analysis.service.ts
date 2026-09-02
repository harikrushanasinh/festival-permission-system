import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface StationSuggestion {
  stationId: string;
  stationName: string;
  stationCode: string;
  distanceKm: number;
  coveragePercentage: number;
  isResponsible: boolean;
}

const RESPONSIBLE_COVERAGE_THRESHOLD = 15; // % of route length, stations above this are marked responsible

@Injectable()
export class RouteAnalysisService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Route -> intersecting jurisdiction areas -> responsible police stations (B11/B12).
   * Nearest station is not necessarily the responsible one - jurisdiction (area
   * boundary intersection with the route path) takes priority. Falls back to
   * plain nearest-station-by-distance only when the route crosses no defined
   * area at all, so there's always something to suggest.
   */
  async analyze(routeVersionId: string): Promise<StationSuggestion[]> {
    const [route] = await this.dataSource.query(
      'SELECT id, path IS NOT NULL AS "hasPath" FROM route_versions WHERE id = $1',
      [routeVersionId],
    );
    if (!route) throw new NotFoundException('Route version not found');
    if (!route.hasPath) {
      throw new BadRequestException('Calculate the route (POST /route-versions/:id/calculate) before analyzing it');
    }

    const byJurisdiction: Omit<StationSuggestion, 'isResponsible'>[] = await this.dataSource.query(
      `WITH intersecting AS (
         SELECT a.police_station_id,
                ST_Length(ST_Intersection(rv.path::geometry, a.boundary::geometry)::geography) AS overlap_length,
                ST_Length(rv.path) AS total_length
         FROM route_versions rv
         JOIN areas a ON ST_Intersects(a.boundary, rv.path)
         WHERE rv.id = $1
       )
       SELECT ps.id AS "stationId", ps.name AS "stationName", ps.code AS "stationCode",
              ROUND((ST_Distance(ps.location, (SELECT path FROM route_versions WHERE id = $1)) / 1000)::numeric, 2) AS "distanceKm",
              ROUND((SUM(i.overlap_length) / NULLIF(MAX(i.total_length), 0) * 100)::numeric, 2) AS "coveragePercentage"
       FROM intersecting i
       JOIN police_stations ps ON ps.id = i.police_station_id
       GROUP BY ps.id, ps.name, ps.code
       ORDER BY "coveragePercentage" DESC`,
      [routeVersionId],
    );

    if (byJurisdiction.length > 0) {
      return byJurisdiction.map((row, index) => ({
        ...row,
        // Highest-coverage station(s) are responsible; anything below the
        // threshold is still shown as a suggestion but flagged for manual review.
        isResponsible: index === 0 || Number(row.coveragePercentage) >= RESPONSIBLE_COVERAGE_THRESHOLD,
      }));
    }

    // No area intersects this route at all - fall back to nearest stations so
    // there's still something for the organizer/police to work with, but none
    // of them are auto-marked responsible since jurisdiction couldn't confirm it.
    const nearest: Omit<StationSuggestion, 'isResponsible' | 'coveragePercentage'>[] = await this.dataSource.query(
      `SELECT ps.id AS "stationId", ps.name AS "stationName", ps.code AS "stationCode",
              ROUND((ST_Distance(ps.location, rv.path) / 1000)::numeric, 2) AS "distanceKm"
       FROM police_stations ps, route_versions rv
       WHERE rv.id = $1 AND ps.status = 'ACTIVE'
       ORDER BY ps.location <-> rv.path
       LIMIT 5`,
      [routeVersionId],
    );
    return nearest.map((row) => ({ ...row, coveragePercentage: 0, isResponsible: false }));
  }

  /** Persists analyze() results so the organizer can review/confirm them (F11). */
  async analyzeAndSave(routeVersionId: string, applicationId: string): Promise<StationSuggestion[]> {
    const suggestions = await this.analyze(routeVersionId);

    await this.dataSource.query('DELETE FROM application_police_stations WHERE application_id = $1 AND route_version_id = $2', [
      applicationId, routeVersionId,
    ]);

    for (const s of suggestions) {
      await this.dataSource.query(
        `INSERT INTO application_police_stations
           (application_id, police_station_id, route_version_id, distance_km, coverage_percentage, is_responsible)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [applicationId, s.stationId, routeVersionId, s.distanceKm, s.coveragePercentage, s.isResponsible],
      );
    }
    return suggestions;
  }

  async confirmStation(applicationId: string, policeStationId: string): Promise<void> {
    const result = await this.dataSource.query(
      `UPDATE application_police_stations SET is_confirmed = true
       WHERE application_id = $1 AND police_station_id = $2
       RETURNING id`,
      [applicationId, policeStationId],
    );
    if (result.length === 0) {
      throw new NotFoundException('This police station was not suggested for this application - run analysis first');
    }
  }

  async getSuggestions(applicationId: string): Promise<(StationSuggestion & { isConfirmed: boolean })[]> {
    return this.dataSource.query(
      `SELECT ps.id AS "stationId", ps.name AS "stationName", ps.code AS "stationCode",
              aps.distance_km AS "distanceKm", aps.coverage_percentage AS "coveragePercentage",
              aps.is_responsible AS "isResponsible", aps.is_confirmed AS "isConfirmed"
       FROM application_police_stations aps
       JOIN police_stations ps ON ps.id = aps.police_station_id
       WHERE aps.application_id = $1
       ORDER BY aps.coverage_percentage DESC`,
      [applicationId],
    );
  }
}
