import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class QueryPublicProcessionsDto {
  @IsOptional() @IsUUID()
  festivalId?: string;

  @IsOptional() @IsUUID()
  eventTypeId?: string;

  @IsOptional() @IsUUID()
  policeStationId?: string;

  @IsOptional() @IsDateString()
  date?: string;

  @IsOptional() @IsIn(['upcoming', 'live', 'completed'])
  timeframe?: 'upcoming' | 'live' | 'completed';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize?: number = 20;
}
