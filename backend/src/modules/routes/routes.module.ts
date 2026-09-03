import { Module } from '@nestjs/common';
import { RoutesService } from './routes.service.js';
import { RouteAnalysisService } from './route-analysis.service.js';
import { RoutesController } from './routes.controller.js';

@Module({
  providers: [RoutesService, RouteAnalysisService],
  controllers: [RoutesController],
  exports: [RoutesService, RouteAnalysisService],
})
export class RoutesModule {}
