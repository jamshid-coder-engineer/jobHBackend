import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

import { AuthGuard } from 'src/common/guard/authGuard';
import { RolesGuard } from 'src/common/guard/roleGuard';
import { accessRoles } from 'src/common/decorator/roles.decorator';
import { CurrentUser } from 'src/common/decorator/currentUser.decorator';

import { TokenService } from 'src/infrastructure/token/Token';
import { config } from 'src/config';
import { successRes } from 'src/infrastructure/response/success.response';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('register')
  @accessRoles('public')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

@Post('verify')
@accessRoles('public')
async verify(@Body() body: { email: string; code: string }, @Res({ passthrough: true }) res: Response) {
  const result = await this.authService.verifyOtp(body.email, body.code);

  
  const refreshToken = (result as any).data.refreshToken as string;
  this.tokenService.writeCookie(res, 'refreshToken', refreshToken, config.JWT.REFRESH_EXPIRES_IN);

  const { refreshToken: _rt, ...dataWithoutRefresh } = (result as any).data;
  return { ...result, data: dataWithoutRefresh };
}

  @Post('login')
  @accessRoles('public')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    
    const refreshToken = (result as any).data.refreshToken as string;

    
    this.tokenService.writeCookie(
      res,
      'refreshToken',
      refreshToken,
      config.JWT.REFRESH_EXPIRES_IN, 
    );

    
    const { refreshToken: _rt, ...dataWithoutRefresh } = (result as any).data;

    return {
      ...(result as any),
      data: dataWithoutRefresh,
    };
  }

  @ApiBearerAuth('bearer')
  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  me(@CurrentUser() user: any) {
    return this.authService.me(user);
  }

  @Post('refresh')
  @accessRoles('public')
  refresh(@Req() req: Request) {
    
    const token = req.cookies?.refreshToken as string | undefined;
    return this.authService.refresh(token || '');
  }

  @Post('logout')
  @accessRoles('public')
  logout(@Res({ passthrough: true }) res: Response) {
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.APP.NODE_ENV === 'production',
      sameSite: config.APP.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    return successRes({ message: 'Logged out' });
  }

@ApiBearerAuth('bearer')
  @Patch('profile') 
  @UseGuards(AuthGuard)
  updateProfile(@CurrentUser() user, @Body() body: any) {
    return this.authService.updateProfile(user.id, body);
  }

}

