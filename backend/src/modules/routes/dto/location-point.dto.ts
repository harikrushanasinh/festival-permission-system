import { IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LocationPointDto {
  @IsString() @IsNotEmpty()
  address!: string;

  @IsOptional() @IsString()
  placeId?: string;

  @IsLatitude()
  lat!: number;

  @IsLongitude()
  lng!: number;
}
