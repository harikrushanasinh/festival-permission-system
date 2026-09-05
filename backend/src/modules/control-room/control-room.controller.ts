import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ControlRoomService } from './control-room.service.js';
import { QueryControlRoomDto } from './dto/query-control-room.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.POLICE_ADMIN, UserRole.POLICE_OFFICER)
@Controller('control-room')
export class ControlRoomController {
  constructor(private readonly controlRoomService: ControlRoomService) {}

  @Get('live')
  listLive(@Query() query: QueryControlRoomDto) {
    return this.controlRoomService.listLive(query);
  }

  @Get('live/:applicationId')
  getDetail(@Param('applicationId', ParseUUIDPipe) applicationId: string) {
    return this.controlRoomService.getDetail(applicationId);
  }
}
