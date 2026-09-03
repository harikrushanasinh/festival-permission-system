import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './application.entity.js';
import { ApplicationStatusHistory } from './application-status-history.entity.js';
import { ApplicationsService } from './applications.service.js';
import { ApplicationsController } from './applications.controller.js';
import { Festival } from '../festivals/festival.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Application, ApplicationStatusHistory, Festival])],
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
