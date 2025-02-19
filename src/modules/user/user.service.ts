import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthChangePassword, AuthVerifiedOtp } from 'src/auth/dto/auth.dto';
import * as dayjs from 'dayjs';
import { MailerService } from '@nest-modules/mailer';
import { IUpdatePassword } from './user.controller';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private mailerService: MailerService,
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
    return this.userRepository.findOne({ where: { email } });
  }

  async isActiveGmail(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { email } });
    return user?.isActive || false;
  }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException(`The email ${existingUser.email} exists`);
    }

    const user = this.userRepository.create({
      ...createUserDto,
      password: await this.hashPassword(createUserDto.password),
      otp: this.generateOTP(),
      isActive: false,
      otpExpired: dayjs().add(10, 'minutes').toDate(),
    });

    const savedUser = await this.userRepository.save(user);

    // await this.mailerService.sendMail({
    //   to: savedUser.email,
    //   subject: 'Welcome to the platform',
    //   template: './otpVerified',
    //   context: {
    //     name: savedUser.name,
    //     otp: savedUser.otp,
    //   },
    // });

    // return { id: savedUser.id, email: savedUser.email };
    return savedUser
  }

  async verifyOtp(data: AuthVerifiedOtp) {
    const user = await this.userRepository.findOne({
      where: { id: data.id, otp: data.otp },
    });

    if (!user || user.otp !== data.otp) {
      throw new BadRequestException('The OTP is not valid or expired');
    }

    if (dayjs().isAfter(user.otpExpired)) {
      throw new BadRequestException('The OTP is expired');
    }

    user.isActive = true;
    user.otp = null; // Clear OTP after activation
    user.otpExpired = null; // Clear expiration
    await this.userRepository.save(user);

    return { success: true, message: 'Account activated successfully' };
  }

  async resendOtp(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new BadRequestException('Invalid user');
    }

    user.otp = this.generateOTP();
    user.otpExpired = dayjs().add(10, 'minutes').toDate();
    await this.userRepository.save(user);

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Resend OTP',
      template: './otpVerified',
      context: {
        name: user.name,
        otp: user.otp,
      },
    });

    return { id: user.id, email: user.email };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new BadRequestException('User does not exist');
    }

    user.otp = this.generateOTP();
    user.otpExpired = dayjs().add(10, 'minutes').toDate();
    await this.userRepository.save(user);

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'OTP for Password Reset',
      template: './otpVerified',
      context: {
        name: user.name,
        otp: user.otp,
      },
    });

    return { id: user.id, email: user.email };
  }

  async changePassword(data: AuthChangePassword) {
    if (data.password !== data.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
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

    user.password = await this.hashPassword(data.password);
    user.otp = null; // Clear OTP after password reset
    user.otpExpired = null; // Clear expiration
    await this.userRepository.save(user);

    return { id: user.id, email: user.email };
  }
  async updatePassword(id: number, updateUserDto: IUpdatePassword) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (user!) {
      throw new BadRequestException('User does not exist');
    }

    const isMatch = await bcrypt.compare(
      updateUserDto.password,
      (await user).password,
    );
    if (!isMatch) {
      throw new BadRequestException('Incorrect password');
    }

    (await user).password = updateUserDto.newPassword;
    return await this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
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
}
