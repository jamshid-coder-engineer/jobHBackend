import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

import { AuthGuard } from 'src/common/guard/authGuard';
import { RolesGuard } from 'src/common/guard/roleGuard';
import { accessRoles } from 'src/common/decorator/roles.decorator';
import { CurrentUser } from 'src/common/decorator/currentUser.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @accessRoles('public')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @accessRoles('public')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  me(@CurrentUser() user: any) {
    return this.authService.me(user);
  }

  @Post('refresh')
  @accessRoles('public')
  refresh(@Req() req: Request) {
    const token =
      (req.headers['x-refresh-token'] as string) ||
      (req.body?.refreshToken as string);

    return this.authService.refresh(token);
  }

  @Post('logout')
  @accessRoles('public')
  logout() {
    return this.authService.logout();
  }
}
