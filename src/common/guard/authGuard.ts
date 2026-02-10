import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { ROLES_KEY } from '../decorator/roles.decorator';
import { TokenService } from '../../infrastructure/token/Token';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (roles?.includes('public')) return true;

    const req = ctx.switchToHttp().getRequest<Request>();


    const token = req.cookies['accessToken']; 

    if (!token) {
      throw new UnauthorizedException('Siz tizimga kirmagansiz (Token yo\'q)');
    }

    try {
      const data = await this.tokenService.verifyAccessToken(token);
      
      req['user'] = data;
      
      return true;
    } catch (error: any) {
      console.log('Auth error:', error.message);
      
      if (error?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token muddati tugagan');
      }
      if (error?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Noto\'g\'ri token');
      }
      throw new InternalServerErrorException('Avtorizatsiya xatosi');
    }
  }
}