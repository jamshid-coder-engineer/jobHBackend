import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ example: 'admin@uz.job', description: 'Admin emaili' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'secret123', description: 'Parol' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Admin Bek', description: 'Ismi' })
  @IsString()
  @IsNotEmpty()
  firstName: string;
}