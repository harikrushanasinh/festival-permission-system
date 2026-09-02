import {
  Body, Controller, Delete, Get, Param, ParseFloatPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { PoliceStationsService } from './police-stations.service.js';
import { CreatePoliceStationDto } from './dto/create-police-station.dto.js';
import { UpdatePoliceStationDto } from './dto/update-police-station.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

@Controller('police-stations')
export class PoliceStationsController {
  constructor(private readonly policeStationsService: PoliceStationsService) {}

  @Get()
  findAll() {
    return this.policeStationsService.findAll();
  }

  @Get('nearest')
  findNearest(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('limit') limit?: string,
  ) {
    return this.policeStationsService.findNearest(lat, lng, limit ? parseInt(limit, 10) : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.policeStationsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreatePoliceStationDto) {
    return this.policeStationsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePoliceStationDto) {
    return this.policeStationsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.policeStationsService.remove(id);
  }
}
