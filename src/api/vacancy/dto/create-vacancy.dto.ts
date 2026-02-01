import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EmploymentType } from 'src/common/enum/roles.enum';

export class CreateVacancyDto {
  @ApiProperty({ example: 'Frontend Developer', maxLength: 160 })
  @IsString()
  @MaxLength(160)
  title: string;

  @ApiProperty({ example: 'React + TypeScript, 2+ years experience...' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: 'Tashkent' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '1500' })
  @IsOptional()
  @IsString()
  salaryFrom?: string;

  @ApiPropertyOptional({ example: '3000' })
  @IsOptional()
  @IsString()
  salaryTo?: string;

  @ApiPropertyOptional({
    example: EmploymentType.FULL_TIME,
    enum: EmploymentType,
  })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;
}
