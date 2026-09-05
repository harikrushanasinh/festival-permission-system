import { Module } from '@nestjs/common';
import { LiveTrackingService } from './live-tracking.service.js';
import { LiveTrackingController } from './live-tracking.controller.js';
import { LiveTrackingGateway } from './live-tracking.gateway.js';

@Module({
  providers: [LiveTrackingService, LiveTrackingGateway],
  controllers: [LiveTrackingController],
  exports: [LiveTrackingService],
})
export class LiveTrackingModule {}
