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
import { IS_PUBLIC_KEY } from '../Public';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      console.log('🌐 [RolesGuard] Public route - access granted');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    // Fetch user with role and permissions
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions'],
    });

    if (!user) throw new ForbiddenException('User not found');

    console.log('👤 [RolesGuard] User:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role?.name,
    });

    if (user.role.name.toLowerCase() === 'admin') {
      console.log('👑 [RolesGuard] Admin user - access granted');
      return true;
    }

    // Get current request API and method
    const currentApi = request.route?.path || request.url;
    const currentMethod = request.method;

    console.log('🎯 [RolesGuard] Checking access for:', {
      api: currentApi,
      method: currentMethod,
    });

    console.log('🔑 [RolesGuard] User permissions:',
      user.role.permissions.map(p => ({
        api: p.api,
        method: p.method,
        module: p.module,
      }))
    );

    // Check if user has permission for current API and method
    const hasPermission = user.role.permissions.some(
      (perm) =>
        perm.api &&
        perm.method &&
        perm.api === currentApi &&
        perm.method === currentMethod,
    );

    console.log(hasPermission ? '✅ [RolesGuard] Permission granted' : '❌ [RolesGuard] Permission denied');

    if (!hasPermission) throw new ForbiddenException('Access denied');
    return true;
  }
}
