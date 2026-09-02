import { Module } from '@nestjs/common';
import { RoutesService } from './routes.service.js';
import { RoutesController } from './routes.controller.js';

@Module({
  providers: [RoutesService],
  controllers: [RoutesController],
  exports: [RoutesService],
})
export class RoutesModule {}
