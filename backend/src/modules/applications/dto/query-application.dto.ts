import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApplicationStatus } from '../application-status.enum.js';

export class QueryApplicationDto {
  @IsOptional() @IsUUID()
  festivalId?: string;

  @IsOptional() @IsUUID()
  eventTypeId?: string;

  @IsOptional() @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize?: number = 20;

  @IsOptional() @IsIn(['eventDate', 'createdAt'])
  sortBy?: 'eventDate' | 'createdAt' = 'eventDate';
}
