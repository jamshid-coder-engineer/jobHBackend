import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { TokenService } from 'src/infrastructure/token/Token';
import { config } from 'src/config';

import { AuthGuard } from 'src/common/guard/authGuard';
import { accessRoles } from 'src/common/decorator/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    // refresh tokenni cookie’da ham yozib qo‘yamiz (xohlasang keyin o‘chiramiz)
    this.tokenService.writeCookie(res, 'refreshToken', result.refreshToken, config.JWT.REFRESH_EXPIRES_IN);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }
@Post('refresh')
async refresh(
  @Body() dto: RefreshDto,
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
) {
  const cookieToken = (req as any).cookies?.refreshToken as string | undefined;
  const refreshToken = dto.refreshToken || cookieToken;

  if (!refreshToken) {
    throw new UnauthorizedException('Refresh token not provided');
  }

  const result = await this.authService.refresh(refreshToken);

  this.tokenService.writeCookie(
    res,
    'refreshToken',
    result.refreshToken,
    config.JWT.REFRESH_EXPIRES_IN,
  );

  return { accessToken: result.accessToken };
}

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken', { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @accessRoles('public') // bu shart emas, olib tashlash ham mumkin
  async me(@Req() req: any) {
    return req.user;
  }
}
