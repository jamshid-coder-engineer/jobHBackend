import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateApplicationDto {
  @IsUUID()
  vacancyId: string;

  @IsOptional()
  @IsString()
  coverLetter?: string;
}
