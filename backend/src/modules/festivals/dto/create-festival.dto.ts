import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateFestivalDto {
  @IsString() @IsNotEmpty() @Matches(/^[A-Z0-9_]+$/, { message: 'code must be upper-snake-case, e.g. GANPATI' })
  code!: string;

  @IsString() @IsNotEmpty()
  name!: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsInt()
  displayOrder?: number;
}
