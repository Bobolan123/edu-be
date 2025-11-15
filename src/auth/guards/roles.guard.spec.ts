import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolesGuard } from './roles.guard';
import { User } from '../../entities/user.entity';

describe('RolesGuard - Unit Tests', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let userRepository: Repository<User>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: {
      id: 1,
      name: 'student',
      permissions: [
        {
          id: 1,
          api: '/api/courses',
          method: 'GET',
          module: 'Course',
          description: 'View courses',
        },
      ],
    },
  };
 
  const mockAdminUser = {
    id: 2,
    email: 'admin@example.com',
    name: 'Admin User',
    role: {
      id: 2,
      name: 'admin',
      permissions: [],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (user?: any, route?: string, method?: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: user !== undefined ? user : { id: 1 },
          route: { path: route || '/api/courses' },
          url: route || '/api/courses',
          method: method || 'GET',
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('Public Routes', () => {
    it('should allow access to public routes', async () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const context = createMockExecutionContext();

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalled();
    });
  });

  describe('Authentication Checks', () => {
    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(reflector, 'get').mockReturnValue(['GET:/api/courses']);
      const context = createMockExecutionContext(null);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('User not authenticated');
    });
  });

  describe('Permission-Based Access', () => {
    it('should allow access when user has correct permission', async () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(reflector, 'get').mockReturnValue(['GET:/api/courses']);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      const context = createMockExecutionContext({ id: 1 }, '/api/courses', 'GET');

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['role', 'role.permissions'],
      });
    });

    it('should deny access when user lacks required permission', async () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(reflector, 'get').mockReturnValue(['POST:/api/courses']);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      const context = createMockExecutionContext({ id: 1 }, '/api/courses', 'POST');

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Access denied');
    });

    it('should allow access to any route without @Permissions decorator', async () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(reflector, 'get').mockReturnValue(null); // No permissions required
      const context = createMockExecutionContext({ id: 1 });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Admin Role', () => {
    it('should allow admin to access any route regardless of permissions', async () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(reflector, 'get').mockReturnValue(['DELETE:/api/courses/:id']);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockAdminUser as any);
      const context = createMockExecutionContext({ id: 2 }, '/api/courses/1', 'DELETE');

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should throw ForbiddenException when user is not found', async () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(reflector, 'get').mockReturnValue(['GET:/api/courses']);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      const context = createMockExecutionContext({ id: 999 });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('User not found');
    });
  });
});
