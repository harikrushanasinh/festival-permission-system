import {
  Body, Controller, Delete, Get, Param, ParseFloatPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { AreasService } from './areas.service.js';
import { CreateAreaDto } from './dto/create-area.dto.js';
import { UpdateAreaDto } from './dto/update-area.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Get()
  findAll() {
    return this.areasService.findAll();
  }

  @Get('lookup')
  lookupByPoint(@Query('lat', ParseFloatPipe) lat: number, @Query('lng', ParseFloatPipe) lng: number) {
    return this.areasService.lookupByPoint(lat, lng);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.areasService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateAreaDto) {
    return this.areasService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAreaDto) {
    return this.areasService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.areasService.remove(id);
  }
}
