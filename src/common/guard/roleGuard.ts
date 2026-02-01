import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorator/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();

    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!roles || roles.length === 0 || roles.includes('public')) return true;

    if (!req.user) throw new ForbiddenException();

    const canById = roles.includes('ID') && req.user?.id == req.params?.id;

    const canByRole = req.user?.role && roles.includes(req.user.role);

    if (canByRole || canById) return true;

    throw new ForbiddenException();
  }
}
