import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @IsNotEmpty()
  name!: string;

  @IsString() @IsNotEmpty()
  mobile!: string;

  @IsEmail()
  email!: string;

  @IsString() @MinLength(8)
  password!: string;

  @IsString() @IsNotEmpty()
  address!: string;

  @IsString() @IsNotEmpty()
  city!: string;

  @IsString() @IsNotEmpty()
  area!: string;

  @IsString() @IsNotEmpty()
  organizationName!: string;
}
