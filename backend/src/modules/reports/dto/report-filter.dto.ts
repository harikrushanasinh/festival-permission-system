import { IsDateString, IsOptional, IsUUID } from 'class-validator';

/**
 * Shared date/festival/event-type scoping for every report endpoint (B23).
 * All fields are optional - an unscoped report covers everything in the system.
 */
export class ReportFilterDto {
  @IsOptional() @IsDateString()
  from?: string;

  @IsOptional() @IsDateString()
  to?: string;

  @IsOptional() @IsUUID()
  festivalId?: string;

  @IsOptional() @IsUUID()
  eventTypeId?: string;
}
