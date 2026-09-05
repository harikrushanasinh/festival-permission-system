import { IsISO8601, IsLatitude, IsLongitude, IsNumber, IsOptional, Min } from 'class-validator';

export class RecordLocationDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsOptional() @IsNumber() @Min(0)
  speed?: number;

  @IsOptional() @IsNumber()
  heading?: number;

  @IsOptional() @IsNumber() @Min(0)
  accuracy?: number;

  @IsOptional() @IsISO8601()
  timestamp?: string;
}
