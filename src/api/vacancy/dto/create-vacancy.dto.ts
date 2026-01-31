import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EmploymentType } from 'src/core/entity/vacancy.entity';

export class CreateVacancyDto {
  @IsString()
  @MaxLength(160)
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  salaryFrom?: string;

  @IsOptional()
  @IsString()
  salaryTo?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;
}
