import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Festival } from './festival.entity.js';
import { CreateFestivalDto } from './dto/create-festival.dto.js';
import { UpdateFestivalDto } from './dto/update-festival.dto.js';

@Injectable()
export class FestivalsService {
  constructor(@InjectRepository(Festival) private readonly repo: Repository<Festival>) {}

  findAll(activeOnly = false): Promise<Festival[]> {
    return this.repo.find({
      where: activeOnly ? { isActive: true } : {},
      order: { displayOrder: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Festival> {
    const festival = await this.repo.findOneBy({ id });
    if (!festival) throw new NotFoundException('Festival not found');
    return festival;
  }

  async create(dto: CreateFestivalDto): Promise<Festival> {
    const existing = await this.repo.findOneBy({ code: dto.code });
    if (existing) throw new ConflictException(`Festival code "${dto.code}" already exists`);
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateFestivalDto): Promise<Festival> {
    const festival = await this.findOne(id);
    Object.assign(festival, dto);
    return this.repo.save(festival);
  }

  async remove(id: string): Promise<void> {
    const festival = await this.findOne(id);
    await this.repo.remove(festival);
  }
}
