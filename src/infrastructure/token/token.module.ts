import { Module } from '@nestjs/common';
import { TokenService } from './Token';

@Module({
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
