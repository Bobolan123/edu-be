import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, HttpException } from '@nestjs/common';
import { MailerService } from '@nest-modules/mailer';
import * as bcrypt from 'bcrypt';
import * as dayjs from 'dayjs';
import { UserService } from './user.service';
import { User } from '../../entities/user.entity';
import { Role } from 'src/entities/role.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

describe('UserService - Unit Tests', () => {
  let service: UserService;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let mailerService: MailerService;
  let cloudinaryService: CloudinaryService;

  const mockRole: Partial<Role> = {
    id: 1,
    name: 'student',
  };

  const mockUser: Partial<User> = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    role: mockRole as Role,
    isActive: true,
    otp: null,
    otpExpired: null,
  };

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawMany: jest.fn(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            delete: jest.fn(),
            restore: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: CloudinaryService,
          useValue: {
            uploadImage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    mailerService = module.get<MailerService>(MailerService);
    cloudinaryService = module.get<CloudinaryService>(CloudinaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOTP', () => {
    it('should generate a 6-digit OTP', () => {
      const otp = service.generateOTP();
      expect(otp).toBeGreaterThanOrEqual(100000);
      expect(otp).toBeLessThanOrEqual(999999);
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'testPassword123';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(typeof hash).toBe('string');
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: ['role', 'role.permissions'],
        withDeleted: false,
      });
    });

    it('should return null when user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('isActiveGmail', () => {
    it('should return true when user is active', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ ...mockUser, isActive: true } as User);

      const result = await service.isActiveGmail('test@example.com');

      expect(result).toBe(true);
    });

    it('should return false when user is not active', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ ...mockUser, isActive: false } as User);

      const result = await service.isActiveGmail('test@example.com');

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.isActiveGmail('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create user successfully with email/password', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(roleRepository, 'findOne')
        .mockResolvedValue(mockRole as Role);
      jest
        .spyOn(userRepository, 'create')
        .mockReturnValue({ ...createUserDto, isActive: false } as any);
      jest
        .spyOn(userRepository, 'save')
        .mockResolvedValue({ ...createUserDto, id: 2 } as any);
      jest.spyOn(mailerService, 'sendMail').mockResolvedValue(undefined);

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(userRepository.save).toHaveBeenCalled();
      expect(mailerService.sendMail).toHaveBeenCalled();
    });

    it('should create user successfully with Google OAuth', async () => {
      const createUserDto = {
        email: 'google@example.com',
        googleId: 'google123',
        name: 'Google User',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(roleRepository, 'findOne')
        .mockResolvedValue(mockRole as Role);
      jest
        .spyOn(userRepository, 'create')
        .mockReturnValue({ ...createUserDto, isActive: true } as any);
      jest
        .spyOn(userRepository, 'save')
        .mockResolvedValue({ ...createUserDto, id: 3, isActive: true } as any);
      jest.spyOn(mailerService, 'sendMail').mockResolvedValue(undefined);

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(3);
      expect(mailerService.sendMail).not.toHaveBeenCalled();
    });

    it('should throw error if user exists but not verified', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ ...mockUser, isActive: false } as User);

      await expect(service.create(createUserDto)).rejects.toThrow(
        HttpException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        'Email is not verified',
      );
    });

    it('should throw error if user already exists', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);

      await expect(service.create(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if email registered with Google', async () => {
      const createUserDto = {
        email: 'google@example.com',
        password: 'password123',
        name: 'Test User',
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ ...mockUser, googleId: 'google123' } as User);

      await expect(service.create(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        'This email is registered with Google. Please use Google Sign-In.',
      );
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully', async () => {
      const otpData = { id: 1, otp: 123456 };
      const userWithOtp = {
        ...mockUser,
        otp: 123456,
        otpExpired: dayjs().add(5, 'minutes').toISOString(),
        isActive: false,
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(userWithOtp as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);

      const result = await service.verifyOtp(otpData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Account activated successfully');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw error if OTP is invalid', async () => {
      const otpData = { id: 1, otp: 999999 };
      const userWithOtp = {
        ...mockUser,
        otp: 123456,
        otpExpired: dayjs().add(5, 'minutes').toISOString(),
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(userWithOtp as User);

      await expect(service.verifyOtp(otpData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyOtp(otpData)).rejects.toThrow(
        'The OTP is not valid or expired',
      );
    });

    it('should throw error if OTP is expired', async () => {
      const otpData = { id: 1, otp: 123456 };
      const userWithExpiredOtp = {
        ...mockUser,
        otp: 123456,
        otpExpired: dayjs().subtract(1, 'minute').toISOString(),
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(userWithExpiredOtp as User);

      await expect(service.verifyOtp(otpData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyOtp(otpData)).rejects.toThrow(
        'The OTP is expired',
      );
    });
  });

  describe('resendOtp', () => {
    it('should resend OTP successfully', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);
      jest.spyOn(mailerService, 'sendMail').mockResolvedValue(undefined);

      const result = await service.resendOtp('test@example.com');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(mailerService.sendMail).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.resendOtp('nonexistent@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const changePasswordDto = {
        email: 'test@example.com',
        password: 'newPassword123',
        confirmPassword: 'newPassword123',
        otp: '123456',
      };

      const userWithOtp = {
        ...mockUser,
        otp: 123456,
        otpExpired: dayjs().add(5, 'minutes').toISOString(),
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(userWithOtp as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);

      const result = await service.changePassword(changePasswordDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw error if passwords do not match', async () => {
      const changePasswordDto = {
        email: 'test@example.com',
        password: 'password1',
        confirmPassword: 'password2',
        otp: '123456',
      };

      await expect(service.changePassword(changePasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.changePassword(changePasswordDto)).rejects.toThrow(
        'Password and confirm password do not match',
      );
    });

    it('should throw error if OTP is invalid', async () => {
      const changePasswordDto = {
        email: 'test@example.com',
        password: 'newPassword123',
        confirmPassword: 'newPassword123',
        otp: '999999',
      };

      const userWithOtp = {
        ...mockUser,
        otp: 123456,
        otpExpired: dayjs().add(5, 'minutes').toISOString(),
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(userWithOtp as User);

      await expect(service.changePassword(changePasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.changePassword(changePasswordDto)).rejects.toThrow(
        'OTP is invalid',
      );
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const updateDto = {
        id: 1,
        password: 'oldPassword',
        newPassword: 'newPassword123',
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);

      const result = await service.updatePassword(1, updateDto);

      expect(result).toBeDefined();
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw error if old password is incorrect', async () => {
      const updateDto = {
        id: 1,
        password: 'wrongPassword',
        newPassword: 'newPassword123',
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.updatePassword(1, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updatePassword(1, updateDto)).rejects.toThrow(
        'Incorrect password',
      );
    });

    it('should throw error if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.updatePassword(999, { id: 999, password: 'old', newPassword: 'new' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return user when found', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);

      const result = await service.findOne(1);

      expect(result).toEqual(mockUser);
    });

    it('should return deleted user when includeDeleted is true', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);

      const result = await service.findOne(1, true);

      expect(result).toBeDefined();
      expect(mockQueryBuilder.withDeleted).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updateDto = {
        name: 'Updated Name',
        bio: 'Updated bio',
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);
      jest
        .spyOn(userRepository, 'save')
        .mockResolvedValue({ ...mockUser, ...updateDto } as User);

      const result = await service.update(1, updateDto);

      expect(result.name).toBe('Updated Name');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should update user role', async () => {
      const updateDto = { roleId: 2 };
      const instructorRole = { id: 2, name: 'instructor' };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);
      jest
        .spyOn(roleRepository, 'findOne')
        .mockResolvedValue(instructorRole as Role);
      jest
        .spyOn(userRepository, 'save')
        .mockResolvedValue({ ...mockUser, role: instructorRole } as any);

      const result = await service.update(1, updateDto);

      expect(result.role.name).toBe('instructor');
    });

    it('should throw error if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(999, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if role not found', async () => {
      const updateDto = { roleId: 999 };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);
      jest.spyOn(roleRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete user successfully', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);
      jest.spyOn(userRepository, 'softDelete').mockResolvedValue(undefined);

      await service.remove(1);

      expect(userRepository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw error if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(BadRequestException);
    });
  });

  describe('restore', () => {
    it('should restore soft deleted user successfully', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);
      jest.spyOn(userRepository, 'restore').mockResolvedValue(undefined);

      await service.restore(1);

      expect(userRepository.restore).toHaveBeenCalledWith(1);
    });

    it('should throw error if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.restore(999)).rejects.toThrow(BadRequestException);
    });
  });

  describe('forceRemove', () => {
    it('should permanently delete user successfully', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);
      jest.spyOn(userRepository, 'delete').mockResolvedValue(undefined);

      await service.forceRemove(1);

      expect(userRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw error if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.forceRemove(999)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const mockFile = { filename: 'avatar.jpg' } as Express.Multer.File;
      const avatarUrl = 'https://cloudinary.com/avatar.jpg';

      jest.spyOn(service, 'findOne').mockResolvedValue(mockUser as User);
      jest
        .spyOn(cloudinaryService, 'uploadImage')
        .mockResolvedValue(avatarUrl);
      jest
        .spyOn(userRepository, 'save')
        .mockResolvedValue({ ...mockUser, avatar_url: avatarUrl } as User);

      const result = await service.uploadAvatar(1, mockFile);

      expect(result.avatar_url).toBe(avatarUrl);
      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
        mockFile,
        'avatars',
      );
    });

    it('should throw error if user not found', async () => {
      const mockFile = { filename: 'avatar.jpg' } as Express.Multer.File;

      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      await expect(service.uploadAvatar(999, mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const filterDto = {
        page: 1,
        take: 10,
        skip: 0,
        order: 'DESC' as any,
        orderBy: 'id',
      };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockUser], 1]);

      const result = await service.findAll(filterDto);

      expect(result.result).toEqual([mockUser]);
      expect(result.meta).toBeDefined();
    });

    it('should filter by search term', async () => {
      const filterDto = {
        page: 1,
        take: 10,
        skip: 0,
        order: 'DESC' as any,
        orderBy: 'id',
        search: 'test',
      };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockUser], 1]);

      const result = await service.findAll(filterDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(result.result).toBeDefined();
    });
  });
});
