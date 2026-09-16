import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ConflictsService } from './conflicts.service.js';
import { ResolveConflictDto } from './dto/resolve-conflict.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

@UseGuards(JwtAuthGuard)
@Controller()
export class ConflictsController {
  constructor(private readonly conflictsService: ConflictsService) {}

  @Post('applications/:applicationId/conflicts/detect')
  detect(@CurrentUser() user: JwtPayload, @Param('applicationId', ParseUUIDPipe) applicationId: string) {
    return this.conflictsService.detectForApplication(applicationId, user);
  }

  @Get('applications/:applicationId/conflicts')
  list(@CurrentUser() user: JwtPayload, @Param('applicationId', ParseUUIDPipe) applicationId: string) {
    return this.conflictsService.listForApplication(applicationId, user);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.POLICE_ADMIN, UserRole.POLICE_OFFICER)
  @Patch('conflicts/:id/resolve')
  async resolve(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveConflictDto) {
    await this.conflictsService.resolve(id, user, dto);
    return { success: true };
  }
}
