import { permission } from 'process';
import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSearchFilterDto } from './dto/user-search-filter.dto';
import { PageMetaDto, ResponsePaginate } from 'src/common/dtos';
import { User } from '../../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthChangePassword, AuthVerifiedOtp } from 'src/auth/dto/auth.dto';
import * as dayjs from 'dayjs';
import { MailerService } from '@nest-modules/mailer';
import { IUpdatePassword } from './user.controller';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private mailerService: MailerService,
    private cloudinaryService: CloudinaryService,
  ) {}

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
  }

  async hashPassword(password: string): Promise<string> {
    const saltOrRounds = 8;
    const hash = await bcrypt.hash(password, saltOrRounds);
    return hash;
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({ 
      where: { email },
      relations: ['role', 'role.permissions']
    });
  }

  async isActiveGmail(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { email } });
    return user?.isActive || false;
  }

  async create(createUserDto: CreateUserDto) {
    const { email, password, googleId } = createUserDto;

    // Check if the user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser && !existingUser.isActive) {
      throw new HttpException('Email is not verified', 403);
    } else if (existingUser) {
      throw new BadRequestException(
        `The email ${existingUser.email} already exists`,
      );
    }
    // Determine if the user is signing up via OAuth
    const isOAuthUser = googleId;

    // Create new user object
    const user = this.userRepository.create({
      ...createUserDto,
      password: isOAuthUser ? null : await this.hashPassword(password),
      otp: isOAuthUser ? null : this.generateOTP(),
      isActive: isOAuthUser ? true : false,
      otpExpired: isOAuthUser ? null : dayjs().add(10, 'minutes').toISOString(),
    });

    // Save the user to the database
    const savedUser = await this.userRepository.save(user);

    // Send OTP email only for non-OAuth users
    if (!isOAuthUser) {
      await this.sendEmail(user.email, 'Resend OTP', './otpVerified', {
        subject: 'OTP for your Email',
        name: user.name,
        otp: user.otp,
        message: 'Welcome to our Mindful Maze',
      });
    }

    return savedUser;
  }

  private async sendEmail(
    to: string,
    subject: string,
    template: string,
    context: any,
  ) {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template,
        context,
      });
    } catch (error) {
      console.error(`Error sending email to ${to}:`, error);
      throw new BadRequestException('Failed to send email');
    }
  }

  async verifyOtp(data: AuthVerifiedOtp) {
    const user = await this.userRepository.findOne({
      where: { id: data.id, otp: data.otp },
    });

    if (!user || user.otp != data.otp) {
      throw new BadRequestException('The OTP is not valid or expired');
    }

    const currentTime = dayjs();
    const otpExpiryTime = dayjs(user.otpExpired);

    if (currentTime.isAfter(otpExpiryTime)) {
      throw new BadRequestException('The OTP is expired');
    }

    // Activate user
    user.isActive = true;
    user.otp = null;
    user.otpExpired = null;
    await this.userRepository.save(user);

    return { success: true, message: 'Account activated successfully' };
  }

  async resendOtp(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new BadRequestException('Invalid user');
    }

    user.otp = this.generateOTP();
    user.otpExpired = dayjs().add(10, 'minutes').toISOString(); // Consistent format
    await this.userRepository.save(user);

    await this.sendEmail(user.email, 'Resend OTP', './otpVerified', {
      subject: 'OTP for your Email',
      name: user.name,
      otp: user.otp,
      message: 'Welcome to our Mindful Maze',
    });
    return { id: user.id, email: user.email };
  }

  async changePassword(data: AuthChangePassword) {
    if (data.password !== data.confirmPassword) {
      throw new BadRequestException(
        'Password and confirm password do not match',
      );
    }

    const user = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (!user) {
      throw new BadRequestException('Invalid user');
    }

    if (dayjs().isAfter(user.otpExpired)) {
      throw new BadRequestException('The OTP is expired');
    }

    if (data.otp && user.otp && +data.otp !== +user.otp) {
      throw new BadRequestException('OTP is invalid');
    }

    user.password = await this.hashPassword(data.password);
    user.otp = null; // Clear OTP after password reset
    user.otpExpired = null; // Clear expiration
    await this.userRepository.save(user);
    return { id: user.id, email: user.email };
  }

  async updatePassword(id: number, updateUserDto: IUpdatePassword) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new BadRequestException('User does not exist');
    }

    const isMatch = await bcrypt.compare(updateUserDto.password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Incorrect password');
    }

    user.password = updateUserDto.newPassword;
    return await this.userRepository.save(user);
  }

  async findOneByToken(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'role.permissions'],
    });
    return user;
  }

  async getRolePermission(userId: number) {
    try {
      const permissions = await this.userRepository
        .createQueryBuilder('user')
        .leftJoin('user.role', 'role')
        .leftJoin('role.permission', 'permission')
        .select(['permission.action AS action', 'permission.module  AS module'])
        .where('user.id = :userId', { userId })
        .getRawMany(); // Use getRawMany to fetch raw data for the APIs
      return permissions;
    } catch (error) {
      console.log(error);
    }
  }

  async findAll(filterDto: UserSearchFilterDto): Promise<ResponsePaginate<User>> {
    const {
      search,
      name,
      email,
      roleId,
      order,
      orderBy,
    } = filterDto;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role');

    // General search across name and email
    if (search) {
      queryBuilder.andWhere(
        '(user.name LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Specific name search
    if (name) {
      queryBuilder.andWhere('user.name LIKE :name', {
        name: `%${name}%`,
      });
    }

    // Specific email search
    if (email) {
      queryBuilder.andWhere('user.email LIKE :email', {
        email: `%${email}%`,
      });
    }

    // Role filter
    if (roleId) {
      queryBuilder.andWhere('user.role = :roleId', { roleId });
    }

    // Sorting
    const validOrderByFields = ['name', 'email', 'id', 'createdAt', 'updatedAt'];
    const sortField = validOrderByFields.includes(orderBy) ? orderBy : 'id';

    queryBuilder
      .orderBy(`user.${sortField}`, order || 'DESC')
      .skip(filterDto.skip)
      .take(filterDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: filterDto,
    });

    return { result: items, meta: pageMetaDto };
  }

  async findOne(id: number): Promise<User> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['role', 'courses'],
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new BadRequestException('Invalid user');
    }

    Object.assign(user, updateUserDto);
    await this.userRepository.save(user);

    return user;
  }

  async remove(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new BadRequestException('Invalid user');
    }

    return this.userRepository.delete(id);
  }

  async uploadAvatar(id: number, file: Express.Multer.File): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const avatarUrl = await this.cloudinaryService.uploadImage(file, 'avatars');
    user.avatar_url = avatarUrl;
    return this.userRepository.save(user);
  }
}
