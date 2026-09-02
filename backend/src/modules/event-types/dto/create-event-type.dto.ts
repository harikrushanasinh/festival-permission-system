import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateEventTypeDto {
  @IsString() @IsNotEmpty() @Matches(/^[A-Z0-9_]+$/, { message: 'code must be upper-snake-case, e.g. AAGMAN' })
  code!: string;

  @IsString() @IsNotEmpty()
  name!: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
