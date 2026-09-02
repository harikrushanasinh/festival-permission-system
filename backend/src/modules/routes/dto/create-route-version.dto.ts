import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';
import { LocationPointDto } from './location-point.dto.js';

export class CreateRouteVersionDto {
  @IsDefined() @ValidateNested() @Type(() => LocationPointDto)
  start!: LocationPointDto;

  @IsDefined() @ValidateNested() @Type(() => LocationPointDto)
  destination!: LocationPointDto;

  // Intermediate waypoints only, in order - start/destination are supplied separately.
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => LocationPointDto)
  points?: LocationPointDto[];

  // Populated when this version exists because police requested changes to a prior one.
  @IsOptional() @IsString()
  changeReason?: string;
}
