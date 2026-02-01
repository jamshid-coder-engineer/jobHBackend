import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'OpenSoft LLC', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    example: 'We build SaaS products',
    description: 'Company description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://opensoft.uz',
    description: 'Company website',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    example: 'Tashkent, Uzbekistan',
    description: 'Company location',
  })
  @IsOptional()
  @IsString()
  location?: string;
}
