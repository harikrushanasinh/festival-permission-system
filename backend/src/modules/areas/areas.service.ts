import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { Polygon } from 'geojson';
import { Area } from './area.entity.js';
import { CreateAreaDto } from './dto/create-area.dto.js';
import { UpdateAreaDto } from './dto/update-area.dto.js';

export interface AreaWithBoundary {
  id: string;
  name: string;
  code: string;
  city: string | null;
  policeStationId: string;
  boundary: Polygon;
}

export interface JurisdictionLookupResult {
  areaId: string;
  areaName: string;
  policeStationId: string;
  policeStationName: string;
  policeStationCode: string;
}

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(Area) private readonly repo: Repository<Area>,
    private readonly dataSource: DataSource,
  ) {}

  private toWkt(ring: [number, number][]): string {
    const points = [...ring];
    const [firstLng, firstLat] = points[0];
    const [lastLng, lastLat] = points[points.length - 1];
    if (firstLng !== lastLng || firstLat !== lastLat) points.push(points[0]);
    if (points.length < 4) {
      throw new BadRequestException('boundary must have at least 3 distinct points');
    }
    const wkt = points.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
    return `POLYGON((${wkt}))`;
  }

  async findAll(): Promise<AreaWithBoundary[]> {
    return this.dataSource.query(`
      SELECT id, name, code, city, police_station_id AS "policeStationId",
             ST_AsGeoJSON(boundary)::json AS boundary
      FROM areas
      ORDER BY name ASC
    `);
  }

  async findOne(id: string): Promise<AreaWithBoundary> {
    const rows: AreaWithBoundary[] = await this.dataSource.query(
      `SELECT id, name, code, city, police_station_id AS "policeStationId",
              ST_AsGeoJSON(boundary)::json AS boundary
       FROM areas WHERE id = $1`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Area not found');
    return rows[0];
  }

  async create(dto: CreateAreaDto): Promise<AreaWithBoundary> {
    const existing = await this.repo.findOneBy({ code: dto.code });
    if (existing) throw new ConflictException(`Area code "${dto.code}" already exists`);

    const wkt = this.toWkt(dto.boundary);
    const rows: { id: string }[] = await this.dataSource.query(
      `INSERT INTO areas (name, code, city, police_station_id, boundary)
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromText($5), 4326)::geography)
       RETURNING id`,
      [dto.name, dto.code, dto.city ?? null, dto.policeStationId, wkt],
    );
    return this.findOne(rows[0].id);
  }

  async update(id: string, dto: UpdateAreaDto): Promise<AreaWithBoundary> {
    await this.findOne(id);

    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (dto.name !== undefined) { sets.push(`name = $${i++}`); params.push(dto.name); }
    if (dto.code !== undefined) { sets.push(`code = $${i++}`); params.push(dto.code); }
    if (dto.city !== undefined) { sets.push(`city = $${i++}`); params.push(dto.city); }
    if (dto.policeStationId !== undefined) { sets.push(`police_station_id = $${i++}`); params.push(dto.policeStationId); }
    if (dto.boundary !== undefined) {
      sets.push(`boundary = ST_SetSRID(ST_GeomFromText($${i++}), 4326)::geography`);
      params.push(this.toWkt(dto.boundary));
    }
    sets.push(`updated_at = now()`);

    if (sets.length > 1) {
      params.push(id);
      await this.dataSource.query(`UPDATE areas SET ${sets.join(', ')} WHERE id = $${i}`, params);
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.delete(id);
  }

  /** Point-in-polygon jurisdiction lookup (B07/B11 core building block). */
  async lookupByPoint(lat: number, lng: number): Promise<JurisdictionLookupResult[]> {
    return this.dataSource.query(
      `SELECT a.id AS "areaId", a.name AS "areaName",
              ps.id AS "policeStationId", ps.name AS "policeStationName", ps.code AS "policeStationCode"
       FROM areas a
       JOIN police_stations ps ON ps.id = a.police_station_id
       WHERE ST_Covers(a.boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)`,
      [lng, lat],
    );
  }
}
