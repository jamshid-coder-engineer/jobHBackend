import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { EmploymentType } from 'src/core/entity/vacancy.entity';

export class VacancyQueryDto {
  @IsOptional()
  @IsString()
  q?: string; // title search

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
