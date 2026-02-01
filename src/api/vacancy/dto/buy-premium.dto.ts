import { IsInt, Max, Min } from 'class-validator';

export class BuyPremiumDto {
  @IsInt()
  @Min(1)
  @Max(365)
  days: number; // nechchi kunga premium
}
