import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/common/constants';
import { Roles } from '../roles.decorator';
import { PERMISSIONS_KEY } from 'src/decorator/requirePermission.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(PERMISSIONS_KEY, context.getHandler());

    const roles = this.reflector.get(Roles, context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('User not found');

    const userPermissions = user.roles.flatMap(role => role.permissions.map(p => p.action));

    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) throw new ForbiddenException('Access denied');

    return this.matchRoles(roles, user.type);

    return true
  }

  matchRoles(roles: Role[], userRole: Role): boolean {
    return roles.includes(userRole);
  }
}
