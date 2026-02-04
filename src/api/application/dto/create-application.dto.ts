import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({
    example: '2f2d7d8f-4c22-4c50-9d2a-61a4f4e3b5c1',
    description: 'Vacancy ID (UUID)',
  })
  @IsUUID()
  vacancyId: string;

  @ApiPropertyOptional({
    example: 'Salom, men React boyicha 2 yil tajribaman...',
    description: 'Cover letter (optional)',
  })
  @IsOptional()
  @IsString()
  coverLetter?: string;
}
