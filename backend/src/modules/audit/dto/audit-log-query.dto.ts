import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AuditLogQueryDto {
  @IsOptional() @IsString()
  entityType?: string;

  @IsOptional() @IsUUID()
  entityId?: string;

  @IsOptional() @IsUUID()
  userId?: string;

  @IsOptional() @IsString()
  action?: string;

  @IsOptional() @IsDateString()
  from?: string;

  @IsOptional() @IsDateString()
  to?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize?: number = 25;
}
