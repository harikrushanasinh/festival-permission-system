import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PoliceStation } from './police-station.entity.js';
import { CreatePoliceStationDto } from './dto/create-police-station.dto.js';
import { UpdatePoliceStationDto } from './dto/update-police-station.dto.js';

export interface NearestStation {
  id: string;
  name: string;
  code: string;
  distanceKm: number;
}

@Injectable()
export class PoliceStationsService {
  constructor(@InjectRepository(PoliceStation) private readonly repo: Repository<PoliceStation>) {}

  findAll(): Promise<PoliceStation[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<PoliceStation> {
    const station = await this.repo.findOneBy({ id });
    if (!station) throw new NotFoundException('Police station not found');
    return station;
  }

  async create(dto: CreatePoliceStationDto): Promise<PoliceStation> {
    const existing = await this.repo.findOneBy({ code: dto.code });
    if (existing) throw new ConflictException(`Police station code "${dto.code}" already exists`);
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdatePoliceStationDto): Promise<PoliceStation> {
    const station = await this.findOne(id);
    Object.assign(station, dto);
    return this.repo.save(station);
  }

  async remove(id: string): Promise<void> {
    const station = await this.findOne(id);
    await this.repo.remove(station);
  }

  /** Nearest stations to a point, ranked by geography distance (B12 building block). */
  async findNearest(lat: number, lng: number, limit = 5): Promise<NearestStation[]> {
    return this.repo.query(
      `SELECT id, name, code,
              ROUND((ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000)::numeric, 2) AS "distanceKm"
       FROM police_stations
       WHERE status = 'ACTIVE'
       ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
       LIMIT $3`,
      [lng, lat, limit],
    );
  }
}
