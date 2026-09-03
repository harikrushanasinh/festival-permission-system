import { Controller, Get, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PermitsService } from './permits.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

@Controller()
export class PermitsController {
  constructor(private readonly permitsService: PermitsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('applications/:applicationId/permit')
  findByApplication(@CurrentUser() user: JwtPayload, @Param('applicationId', ParseUUIDPipe) applicationId: string) {
    return this.permitsService.findByApplication(applicationId, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('applications/:applicationId/permit/qr-code')
  async getQrCode(
    @CurrentUser() user: JwtPayload,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Res() res: Response,
  ) {
    const png = await this.permitsService.getQrCodePng(applicationId, user);
    res.set({ 'Content-Type': 'image/png' });
    res.send(png);
  }

  // Deliberately unauthenticated - this is the public "scan QR, verify permit" endpoint (F20).
  @Get('public/verify/:token')
  verify(@Param('token') token: string) {
    return this.permitsService.verifyByToken(token);
  }
}
