import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorator/roles.decorator';
import { TokenService } from '../../infrastructure/token/Token';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // @Roles('public') bo‘lsa token shart emas
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (roles?.includes('public')) return true;

    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers.authorization as string | undefined;

    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();

    const token = auth.slice(7);

    try {
      const data = await this.tokenService.verifyAccessToken(token);
      req.user = data; // controller/service’da req.user ishlaydi
      return true;
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expired');
      }
      if (error?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      throw new InternalServerErrorException('Unexpected auth error');
    }
  }
}
