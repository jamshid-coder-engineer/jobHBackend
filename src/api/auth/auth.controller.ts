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
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';

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
    const result: any = await this.authService.verifyOtp(body.email, body.code);

    this.tokenService.writeCookie(res, 'refreshToken', result.data.refreshToken, config.JWT.REFRESH_EXPIRES_IN);

    this.tokenService.writeCookie(res, 'accessToken', result.data.accessToken, config.JWT.ACCESS_EXPIRES_IN);

    const { refreshToken, accessToken, ...dataWithoutTokens } = result.data;
    return { ...result, data: dataWithoutTokens };
  }

  @Post('login')
  @accessRoles('public')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result: any = await this.authService.login(dto);

    this.tokenService.writeCookie(res, 'refreshToken', result.data.refreshToken, config.JWT.REFRESH_EXPIRES_IN);

    this.tokenService.writeCookie(res, 'accessToken', result.data.accessToken, config.JWT.ACCESS_EXPIRES_IN);

    const { refreshToken, accessToken, ...dataWithoutTokens } = result.data;

    return {
      ...result,
      data: dataWithoutTokens,
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
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refreshToken as string | undefined;
    
    const result: any = await this.authService.refresh(token || '');

    if(result.data?.accessToken) {
       this.tokenService.writeCookie(
         res, 
         'accessToken', 
         result.data.accessToken, 
         config.JWT.ACCESS_EXPIRES_IN
       );
    }

    return { message: 'Token yangilandi' };
  }

  @Post('logout')
  @accessRoles('public')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');

    return successRes({ message: 'Logged out' });
  }

  @ApiBearerAuth('bearer')
  @Patch('profile') 
  @UseGuards(AuthGuard)
  updateProfile(@CurrentUser() user, @Body() body: any) {
    return this.authService.updateProfile(user.id, body);
  }

  @Post('forgot-password')
  @accessRoles('public')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @accessRoles('public')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}