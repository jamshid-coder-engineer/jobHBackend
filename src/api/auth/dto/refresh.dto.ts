import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  // refresh token cookie’da bo‘lsa ham bo‘ladi, body’da ham
  @IsOptional()
  @IsString()
  refreshToken?: string;;
}
