import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Festival } from './festival.entity.js';
import { FestivalsService } from './festivals.service.js';
import { FestivalsController } from './festivals.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Festival])],
  providers: [FestivalsService],
  controllers: [FestivalsController],
  exports: [FestivalsService],
})
export class FestivalsModule {}
