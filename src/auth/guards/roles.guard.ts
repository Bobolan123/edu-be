import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    ); //Utilize requiredPermission decorator for controller

    if (!requiredPermissions) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    // Fetch user with role and permissions
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions'],
    });

    if (!user) throw new ForbiddenException('User not found');

    if (user.role.name.toLowerCase() === 'admin') {
      return true;
    }

    // Get current request API and method
    const currentApi = request.route?.path || request.url;
    const currentMethod = request.method;

    // Check if user has permission for current API and method
    const hasPermission = user.role.permissions.some(
      (perm) =>
        perm.api &&
        perm.method &&
        perm.api === currentApi &&
        perm.method === currentMethod,
    );

    // Also check for legacy permission names if provided
    if (!hasPermission && requiredPermissions) {
      const userPermissionIds = user.role.permissions
        .filter((perm) => perm.method && perm.api)
        .map((perm) => `${perm.method}:${perm.api}`);
      const hasLegacyPermission = requiredPermissions.some((permission) =>
        userPermissionIds.includes(permission),
      );
      if (!hasLegacyPermission) throw new ForbiddenException('Access denied');
    } else if (!hasPermission) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
