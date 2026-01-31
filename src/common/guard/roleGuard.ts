import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
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

    // Role tekshiruvi yo‘q yoki public bo‘lsa o‘tkazamiz
    if (!roles || roles.length === 0 || roles.includes('public')) return true;

    // user bo‘lmasa (auth guard ishlamagan) -> forbidden
    if (!req.user) throw new ForbiddenException();

    // Maxsus qoida: @Roles('ID') bo‘lsa route param id bilan req.user.id teng bo‘lsa o‘tkazadi
    const canById = roles.includes('ID') && req.user?.id == req.params?.id;

    // Oddiy role tekshiruvi
    const canByRole = req.user?.role && roles.includes(req.user.role);

    if (canByRole || canById) return true;

    throw new ForbiddenException();
  }
}
