import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from 'src/core/entity/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { CryptoService } from 'src/infrastructure/crypto/crypto.service';
import { TokenModule } from 'src/infrastructure/token/token.module';
import { AppController } from 'src/app.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), TokenModule],
  controllers: [AuthController,AppController],
  providers: [AuthService, CryptoService],
  exports: [AuthService],
})
export class AuthModule {}
