import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RoutesService } from './routes.service.js';
import { RouteAnalysisService } from './route-analysis.service.js';
import { CreateRouteVersionDto } from './dto/create-route-version.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.POLICE_ADMIN, UserRole.POLICE_OFFICER];

@UseGuards(JwtAuthGuard)
@Controller()
export class RoutesController {
  constructor(
    private readonly routesService: RoutesService,
    private readonly routeAnalysisService: RouteAnalysisService,
    private readonly dataSource: DataSource,
  ) {}

  private async assertApplicationAccess(applicationId: string, user: JwtPayload): Promise<void> {
    if (STAFF_ROLES.includes(user.role)) return;
    const [app] = await this.dataSource.query('SELECT organizer_id AS "organizerId" FROM applications WHERE id = $1', [applicationId]);
    if (!app || app.organizerId !== user.sub) {
      throw new ForbiddenException('You do not have access to this application');
    }
  }

  @Post('applications/:applicationId/routes')
  async createVersion(
    @CurrentUser() user: JwtPayload,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: CreateRouteVersionDto,
  ) {
    await this.assertApplicationAccess(applicationId, user);
    return this.routesService.createVersion(applicationId, user.sub, dto);
  }

  @Get('applications/:applicationId/routes')
  async findByApplication(@CurrentUser() user: JwtPayload, @Param('applicationId', ParseUUIDPipe) applicationId: string) {
    await this.assertApplicationAccess(applicationId, user);
    return this.routesService.findByApplication(applicationId);
  }

  @Get('applications/:applicationId/routes/active')
  async getActive(@CurrentUser() user: JwtPayload, @Param('applicationId', ParseUUIDPipe) applicationId: string) {
    await this.assertApplicationAccess(applicationId, user);
    return this.routesService.getActiveForApplication(applicationId);
  }

  @Post('route-versions/:id/calculate')
  async calculate(@Param('id', ParseUUIDPipe) id: string) {
    return this.routesService.calculate(id);
  }

  @Get('route-versions/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.routesService.findOne(id);
  }

  @Post('applications/:applicationId/routes/:routeVersionId/analyze')
  async analyze(
    @CurrentUser() user: JwtPayload,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('routeVersionId', ParseUUIDPipe) routeVersionId: string,
  ) {
    await this.assertApplicationAccess(applicationId, user);
    return this.routeAnalysisService.analyzeAndSave(routeVersionId, applicationId);
  }

  @Get('applications/:applicationId/police-station-suggestions')
  async getSuggestions(@CurrentUser() user: JwtPayload, @Param('applicationId', ParseUUIDPipe) applicationId: string) {
    await this.assertApplicationAccess(applicationId, user);
    return this.routeAnalysisService.getSuggestions(applicationId);
  }

  @Post('applications/:applicationId/police-station-suggestions/:stationId/confirm')
  async confirmStation(
    @CurrentUser() user: JwtPayload,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('stationId', ParseUUIDPipe) stationId: string,
  ) {
    await this.assertApplicationAccess(applicationId, user);
    await this.routeAnalysisService.confirmStation(applicationId, stationId);
    return { success: true };
  }
}
