import { Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Min,
} from 'class-validator';

export class CreateApplicationDto {
  @IsUUID()
  festivalId!: string;

  @IsUUID()
  eventTypeId!: string;

  @IsString() @IsNotEmpty()
  mandalName!: string;

  @IsString() @IsNotEmpty()
  eventName!: string;

  @IsDateString()
  eventDate!: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be HH:mm' })
  startTime!: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be HH:mm' })
  endTime!: string;

  @Type(() => Number) @IsInt() @Min(1)
  expectedCrowd!: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  vehicleCount?: number;

  @IsOptional() @IsString()
  vehicleType?: string;

  @IsOptional() @IsBoolean()
  hasSoundSystem?: boolean;

  @IsOptional() @IsBoolean()
  hasDj?: boolean;

  @IsOptional() @IsBoolean()
  hasDhol?: boolean;

  @IsOptional() @IsBoolean()
  hasGenerator?: boolean;

  @IsOptional() @IsString()
  specialRequirements?: string;

  @IsOptional() @IsString()
  description?: string;
}
