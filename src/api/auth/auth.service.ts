import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';

import { User } from 'src/core/entity/user.entity';
import { CryptoService } from 'src/infrastructure/crypto/crypto.service';
import { TokenService } from 'src/infrastructure/token/Token';
import { successRes } from 'src/infrastructure/response/success.response';
import { ISuccess } from 'src/infrastructure/pagination/successResponse';
import { Roles } from 'src/common/enum/roles.enum';
import { config } from 'src/config';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface ITokenPayload {
  id: string;
  role: Roles;
  isActive: boolean;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly crypto: CryptoService,
    private readonly jwt: JwtService,
    private readonly tokenService: TokenService,
  ) {}

  async onModuleInit() {
  const exists = await this.userRepo.findOne({
    where: { role: Roles.SUPER_ADMIN } as any,
  });

  if (!exists) {
    const passwordHash = await this.crypto.encrypt(config.SUPER_ADMIN.PASSWORD);

    const superAdmin = this.userRepo.create({
      email: config.SUPER_ADMIN.EMAIL,
      passwordHash,
      role: Roles.SUPER_ADMIN,
      isActive: true,
    });

    await this.userRepo.save(superAdmin);
    console.log(`🛡️ SUPER_ADMIN created: ${config.SUPER_ADMIN.EMAIL}`);
  }
}


  async register(dto: RegisterDto): Promise<ISuccess> {
    const exists = await this.userRepo.findOne({
      where: { email: dto.email } as any,
    });
    if (exists) throw new ConflictException('Email already exists');

    const passwordHash = await this.crypto.encrypt(dto.password);

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      role: dto.role ?? Roles.CANDIDATE,
      isActive: true,
    });

    const saved = await this.userRepo.save(user);

    return successRes(
      { user: { id: saved.id, email: saved.email, role: saved.role } },
      201,
    );
  }

  async login(dto: LoginDto): Promise<ISuccess> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email } as any,
      select: ['id', 'email', 'passwordHash', 'role', 'isActive'] as any,
    });

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

    // NOTE: refreshToken controller'da cookie'ga yozilib, response'dan o'chiriladi
    return successRes({
      user: { id: user.id, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  }

  async me(currentUser: ITokenPayload): Promise<ISuccess> {
    const user = await this.userRepo.findOne({
      where: { id: currentUser.id } as any,
    });
    if (!user) throw new NotFoundException('User not found');

    return successRes({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  }

  async refresh(refreshToken?: string): Promise<ISuccess> {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    let payload: ITokenPayload;
    try {
      payload = await this.jwt.verifyAsync<ITokenPayload>(refreshToken, {
        secret: config.JWT.REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.id } as any,
    });
    if (!user) throw new UnauthorizedException('Invalid refresh token');
    if (!user.isActive) throw new UnauthorizedException('User is inactive');

    const newPayload: ITokenPayload = {
      id: user.id,
      role: user.role,
      isActive: user.isActive,
    };

    const accessToken = await this.tokenService.signAccessToken(newPayload);
    const newRefreshToken = await this.tokenService.signRefreshToken(newPayload);

    // NOTE: controller cookie'ga yozadi, response'dan o'chiradi
    return successRes({
      accessToken,
      refreshToken: newRefreshToken,
    });
  }

  logout(): ISuccess {
    return successRes({ message: 'Logged out' });
  }
}
