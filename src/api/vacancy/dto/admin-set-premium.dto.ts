import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class AdminSetPremiumDto {
  // nechchi kunga premium qilamiz
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days: number;
}
