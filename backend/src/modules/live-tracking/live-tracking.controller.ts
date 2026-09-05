import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { LiveTrackingService } from './live-tracking.service.js';
import { RecordLocationDto } from './dto/record-location.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

@UseGuards(JwtAuthGuard)
@Controller('applications/:applicationId/live')
export class LiveTrackingController {
  constructor(private readonly liveTrackingService: LiveTrackingService) {}

  @Post('start')
  start(@CurrentUser() user: JwtPayload, @Param('applicationId', ParseUUIDPipe) applicationId: string) {
    return this.liveTrackingService.start(applicationId, user);
  }

  @Post('complete')
  complete(@CurrentUser() user: JwtPayload, @Param('applicationId', ParseUUIDPipe) applicationId: string) {
    return this.liveTrackingService.complete(applicationId, user);
  }

  // REST fallback for recording a point (the Socket.IO gateway is the primary
  // path per B18, but a plain HTTP path keeps this independently testable and
  // gives clients a fallback if a socket connection can't be established).
  @Post('location')
  recordLocation(
    @CurrentUser() user: JwtPayload,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: RecordLocationDto,
  ) {
    return this.liveTrackingService.recordLocation(applicationId, user, dto);
  }

  @Get()
  async getCurrent(@Param('applicationId', ParseUUIDPipe) applicationId: string) {
    const location = await this.liveTrackingService.getCurrentLocation(applicationId);
    if (!location) throw new NotFoundException('No live location available for this application');
    return location;
  }
}
