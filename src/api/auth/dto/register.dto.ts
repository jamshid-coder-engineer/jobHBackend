import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Roles } from 'src/common/enum/roles.enum';

export class RegisterDto {
  @ApiProperty({ example: 'cand1@test.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: Roles.CANDIDATE,
    enum: Roles,
    description: 'Role: CANDIDATE (candidate) yoki EMPLOYER (employer)',
  })
  @IsEnum(Roles)
  role: Roles;
}
