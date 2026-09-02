import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventType } from './event-type.entity.js';
import { CreateEventTypeDto } from './dto/create-event-type.dto.js';
import { UpdateEventTypeDto } from './dto/update-event-type.dto.js';

@Injectable()
export class EventTypesService {
  constructor(@InjectRepository(EventType) private readonly repo: Repository<EventType>) {}

  findAll(): Promise<EventType[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<EventType> {
    const eventType = await this.repo.findOneBy({ id });
    if (!eventType) throw new NotFoundException('Event type not found');
    return eventType;
  }

  async create(dto: CreateEventTypeDto): Promise<EventType> {
    const existing = await this.repo.findOneBy({ code: dto.code });
    if (existing) throw new ConflictException(`Event type code "${dto.code}" already exists`);
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateEventTypeDto): Promise<EventType> {
    const eventType = await this.findOne(id);
    Object.assign(eventType, dto);
    return this.repo.save(eventType);
  }

  async remove(id: string): Promise<void> {
    const eventType = await this.findOne(id);
    await this.repo.remove(eventType);
  }
}
