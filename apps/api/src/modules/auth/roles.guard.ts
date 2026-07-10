import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    // Auditor checks: AUDITOR cannot perform state modifying operations (POST, PUT, PATCH, DELETE)
    if (user && user.role === UserRole.AUDITOR && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      throw new ForbiddenException('Auditors have Read-Only access only.');
    }

    if (!requiredRoles) {
      return true;
    }

    if (!user) {
      throw new ForbiddenException('User session not identified.');
    }

    // Admins bypass all role filters
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException('Insufficient security clearance.');
    }
    return true;
  }
}
