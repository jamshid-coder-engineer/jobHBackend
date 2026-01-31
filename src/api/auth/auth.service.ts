import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from 'src/core/entity/user.entity';
import { Roles } from 'src/common/enum/roles.enum';
import { CryptoService } from 'src/infrastructure/crypto/crypto.service';
import { TokenService } from 'src/infrastructure/token/Token';
import type { ITokenPayload } from 'src/infrastructure/token/interface';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly crypto: CryptoService,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already exists');

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash: await this.crypto.encrypt(dto.password),
      role: dto.role ?? Roles.STUDENT,
      isActive: true,
    });

    const saved = await this.userRepo.save(user);

    return {
      id: saved.id,
      email: saved.email,
      role: saved.role,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email, isDeleted: false } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await this.crypto.decrypt(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('User is inactive');

    const payload: ITokenPayload = {
      id: user.id,
      role: user.role,
      isActive: user.isActive,
    };

    const accessToken = await this.tokenService.signAccessToken(payload);
    const refreshToken = await this.tokenService.signRefreshToken(payload);

    return {
      user: { id: user.id, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token required');

    const payload = await this.tokenService.verifyRefreshToken(refreshToken);

    const user = await this.userRepo.findOne({ where: { id: payload.id, isDeleted: false } });
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    if (!user.isActive) throw new UnauthorizedException('User is inactive');

    const newPayload: ITokenPayload = {
      id: user.id,
      role: user.role,
      isActive: user.isActive,
    };

    const accessToken = await this.tokenService.signAccessToken(newPayload);
    const newRefreshToken = await this.tokenService.signRefreshToken(newPayload);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}
