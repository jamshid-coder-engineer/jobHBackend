import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EmploymentType } from 'src/common/enum/roles.enum';

export class UpdateVacancyDto {
  @ApiPropertyOptional({ example: 'Senior Frontend Developer', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Tashkent' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '2000' })
  @IsOptional()
  @IsString()
  salaryFrom?: string;

  @ApiPropertyOptional({ example: '4000' })
  @IsOptional()
  @IsString()
  salaryTo?: string;

  @ApiPropertyOptional({ example: EmploymentType.REMOTE, enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
