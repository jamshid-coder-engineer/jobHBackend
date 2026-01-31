import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Roles } from '../../../common/enum/roles.enum';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  // hh domeniga mos: candidate/employer role tanlab ro‘yxatdan o‘tishi mumkin
  @IsOptional()
  @IsEnum(Roles)
  role?: Roles;
}
