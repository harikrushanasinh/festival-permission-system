import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventType } from './event-type.entity.js';
import { EventTypesService } from './event-types.service.js';
import { EventTypesController } from './event-types.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([EventType])],
  providers: [EventTypesService],
  controllers: [EventTypesController],
  exports: [EventTypesService],
})
export class EventTypesModule {}
