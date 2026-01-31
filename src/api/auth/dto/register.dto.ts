import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Roles } from 'src/common/enum/roles.enum';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  // HH loyihada kerak: kim ro‘yxatdan o‘tyapti (EMPLOYER/CANDIDATE)
  // Hozircha sizning rollar: TEACHER/STUDENT
  @IsEnum(Roles)
  role: Roles;
}
