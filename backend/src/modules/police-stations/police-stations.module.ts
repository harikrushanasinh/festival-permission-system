import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoliceStation } from './police-station.entity.js';
import { PoliceStationsService } from './police-stations.service.js';
import { PoliceStationsController } from './police-stations.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([PoliceStation])],
  providers: [PoliceStationsService],
  controllers: [PoliceStationsController],
  exports: [PoliceStationsService],
})
export class PoliceStationsModule {}
