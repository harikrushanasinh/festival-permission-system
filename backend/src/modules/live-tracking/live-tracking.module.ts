import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LiveTrackingService } from './live-tracking.service.js';
import { LiveTrackingController } from './live-tracking.controller.js';
import { LiveTrackingGateway } from './live-tracking.gateway.js';
import { GpsWatchdogService } from './gps-watchdog.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  providers: [LiveTrackingService, LiveTrackingGateway, GpsWatchdogService],
  controllers: [LiveTrackingController],
  exports: [LiveTrackingService],
})
export class LiveTrackingModule {}
