import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAreaDto {
  @IsString() @IsNotEmpty()
  name!: string;

  @IsString() @IsNotEmpty()
  code!: string;

  @IsOptional() @IsString()
  city?: string;

  @IsUUID()
  policeStationId!: string;

  // Single linear ring, each point [lng, lat]. Does not need to be pre-closed —
  // the service closes it automatically if the last point != first.
  @IsArray() @ArrayMinSize(3)
  boundary!: [number, number][];
}
