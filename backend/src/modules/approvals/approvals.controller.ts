import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApprovalsService } from './approvals.service.js';
import { DecideApprovalDto } from './dto/decide-approval.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

@UseGuards(JwtAuthGuard)
@Controller('applications/:applicationId/approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Param('applicationId', ParseUUIDPipe) applicationId: string) {
    return this.approvalsService.listForApplication(applicationId, user);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.POLICE_ADMIN, UserRole.POLICE_OFFICER)
  @Post(':stationId/decide')
  decide(
    @CurrentUser() user: JwtPayload,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('stationId', ParseUUIDPipe) stationId: string,
    @Body() dto: DecideApprovalDto,
  ) {
    return this.approvalsService.decide(applicationId, stationId, user, dto);
  }
}
