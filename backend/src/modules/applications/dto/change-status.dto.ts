import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChangeStatusDto {
  @IsOptional() @IsString() @IsNotEmpty()
  reason?: string;
}
