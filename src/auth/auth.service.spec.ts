import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UserService } from '../modules/user/user.service';
import { User } from '../entities/user.entity';

describe('AuthService - Unit Tests', () => {
  let authService: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  // Mock user data for testing
  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    password: '$2a$12$hashedPassword',
    name: 'Test User',
    avatar_url: 'http://example.com/avatar.jpg',
    role: {
      id: 1,
      name: 'student',
      permissions: [
        {
          id: 1,
          api: '/api/courses',
          method: 'GET',
          module: 'courses',
          description: 'View courses',
        },
      ],
    },
  } as User;

  beforeEach(async () => {
    // Create a testing module with mocked dependencies
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findByEmail: jest.fn(),
            isActiveGmail: jest.fn(),
            create: jest.fn(),
            findOneByToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                JWT_ACCESS_EXPIRATION: '3600000',
                JWT_REFRESH_EXPIRATION: '604800000',
                JWT_ACCESS_SECRET: 'test-access-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'correctPassword';
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      // Act
      const result = await authService.validateUser(email, password);

      // Assert
      expect(result).toEqual(mockUser);
      expect(userService.findByEmail).toHaveBeenCalledWith(email);
    });

    it('should throw error when credentials are invalid', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'wrongPassword';
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      // Act & Assert
      await expect(authService.validateUser(email, password)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('login', () => {
    it('should return tokens and user data when login is successful', async () => {
      // Arrange
      jest.spyOn(userService, 'isActiveGmail').mockResolvedValue(true);
      jest.spyOn(jwtService, 'sign').mockReturnValue('mock-jwt-token');

      // Act
      const result = await authService.login(mockUser);

      // Assert
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.email).toBe(mockUser.email);
      expect(result.name).toBe(mockUser.name);
    });

    it('should throw error when email is not verified', async () => {
      // Arrange
      jest.spyOn(userService, 'isActiveGmail').mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(mockUser)).rejects.toThrow(
        'Email is not verified',
      );
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const createUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };
      const createdUser = { id: 2, ...createUserDto };
      jest.spyOn(userService, 'create').mockResolvedValue(createdUser as any);

      // Act
      const result = await authService.register(createUserDto as any);

      // Assert
      expect(result).toEqual(createdUser);
      expect(userService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw error when user already exists', async () => {
      // Arrange
      const createUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      };
      jest.spyOn(userService, 'create').mockResolvedValue(null);

      // Act & Assert
      await expect(authService.register(createUserDto as any)).rejects.toThrow(
        `The ${createUserDto.email} exists`,
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const decodedToken = { id: 1, email: 'test@example.com' };
      jest.spyOn(jwtService, 'verify').mockReturnValue(decodedToken);
      jest.spyOn(userService, 'findOneByToken').mockResolvedValue(mockUser);
      jest.spyOn(userService, 'isActiveGmail').mockResolvedValue(true);
      jest.spyOn(jwtService, 'sign').mockReturnValue('new-token');

      // Act
      const result = await authService.refreshToken(refreshToken);

      // Assert
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('should throw error when refresh token is expired', async () => {
      // Arrange
      const refreshToken = 'expired-refresh-token';
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw expiredError;
      });

      // Act & Assert
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        'Refresh token expired. Please login',
      );
    });
  });
});
