import { Global, Module } from '@nestjs/common';
import { TokenService } from './Token';

@Global()
@Module({
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
