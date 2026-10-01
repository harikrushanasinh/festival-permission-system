import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { toCsv } from './csv.util.js';
import { ReportFilterDto } from './dto/report-filter.dto.js';
import { ReportsService } from './reports.service.js';

const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.POLICE_ADMIN, UserRole.POLICE_OFFICER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  summary(@Query() filters: ReportFilterDto) {
    return this.reportsService.summary(filters);
  }

  @Get('by-festival')
  byFestival(@Query() filters: ReportFilterDto) {
    return this.reportsService.byFestival(filters);
  }

  @Get('by-event-type')
  byEventType(@Query() filters: ReportFilterDto) {
    return this.reportsService.byEventType(filters);
  }

  @Get('by-area')
  byArea(@Query() filters: ReportFilterDto) {
    return this.reportsService.byArea(filters);
  }

  @Get('by-police-station')
  byPoliceStation(@Query() filters: ReportFilterDto) {
    return this.reportsService.byPoliceStation(filters);
  }

  @Get('conflicts')
  conflicts(@Query() filters: ReportFilterDto) {
    return this.reportsService.conflicts(filters);
  }

  @Get('deviations')
  deviations(@Query() filters: ReportFilterDto) {
    return this.reportsService.deviations(filters);
  }

  /**
   * CSV export (B23). Excel/PDF export are not implemented - CSV opens in Excel and in
   * every spreadsheet tool without a binary-format library, and nothing in the spec needs
   * server-side pagination/print-layout beyond that, so building xlsx/pdf writers here
   * would be unused weight. If a stakeholder specifically needs .xlsx formatting or a
   * print-ready PDF, that's a follow-up, not a gap found during testing.
   */
  @Get('applications.csv')
  async applicationsCsv(@Query() filters: ReportFilterDto, @Res() res: Response) {
    const rows = await this.reportsService.applicationRows(filters);
    const csv = toCsv(rows, [
      { key: 'applicationNo', header: 'Application No' },
      { key: 'mandalName', header: 'Mandal' },
      { key: 'festivalName', header: 'Festival' },
      { key: 'eventTypeName', header: 'Event Type' },
      { key: 'eventDate', header: 'Event Date' },
      { key: 'startTime', header: 'Start Time' },
      { key: 'endTime', header: 'End Time' },
      { key: 'status', header: 'Status' },
      { key: 'expectedCrowd', header: 'Expected Crowd' },
      { key: 'vehicleCount', header: 'Vehicle Count' },
      { key: 'createdAt', header: 'Created At' },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
    res.send(csv);
  }
}
