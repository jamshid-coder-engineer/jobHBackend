import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminRejectVacancyDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason: string;
}
