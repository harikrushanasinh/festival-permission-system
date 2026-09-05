import { Module } from '@nestjs/common';
import { PublicService } from './public.service.js';
import { PublicController } from './public.controller.js';
import { LiveTrackingModule } from '../live-tracking/live-tracking.module.js';

@Module({
  imports: [LiveTrackingModule],
  providers: [PublicService],
  controllers: [PublicController],
})
export class PublicModule {}
