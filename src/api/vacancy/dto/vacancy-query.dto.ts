import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumberString, IsOptional, IsString, Max, Min, IsNumber } from 'class-validator';
import { EmploymentType } from 'src/common/enum/roles.enum';

export class VacancyQueryDto {
  @ApiPropertyOptional({ example: 'frontend', description: 'Search by title or company name' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 'Tashkent' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: EmploymentType.FULL_TIME,
    enum: EmploymentType,
  })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: 'Minimal maosh ($)', example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minSalary?: number;

  @ApiPropertyOptional({ description: 'Maksimal maosh ($)', example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxSalary?: number;

  @ApiPropertyOptional({ description: 'Ish turi', enum: ['FULL_TIME', 'PART_TIME', 'REMOTE', 'PROJECT'] })
  @IsOptional()
  @IsString()
  type?: string; 

  @ApiPropertyOptional({ description: 'Qachon joylangan', example: '1d (24 soat), 3d (3 kun), 7d (Hafta)' })
  @IsOptional()
  @IsString()
  date?: string;
}