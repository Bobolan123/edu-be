import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/entities/user.entity';
import { Role } from 'src/entities/role.entity';

@Injectable()
export class SeedUsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedUsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const appEnv = this.configService.get('APP_ENV');

    if (appEnv !== 'local' && appEnv !== 'dev') {
      return;
    }

    this.logger.log('Starting development seed process...');
    await this.seedDefaultUsers();
  }

  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  private async seedDefaultUsers(): Promise<void> {
    const defaultUsers = [
      {
        name: this.configService.get('ADMIN_NAME'),
        email: this.configService.get('ADMIN_EMAIL'),
        password: this.configService.get('ADMIN_PASSWORD'),
        roleName: 'admin',
      },
      {
        name: this.configService.get('INSTRUCTOR_NAME'),
        email: this.configService.get('INSTRUCTOR_EMAIL'),
        password: this.configService.get('INSTRUCTOR_PASSWORD'),
        roleName: 'instructor',
      },
      {
        name: this.configService.get('STUDENT_NAME'),
        email: this.configService.get('STUDENT_EMAIL'),
        password: this.configService.get('STUDENT_PASSWORD'),
        roleName: 'student',
      },
    ];

    for (const userData of defaultUsers) {
      if (!userData.email || !userData.password || !userData.name) {
        this.logger.warn(`Skipping user creation: missing data for ${userData.roleName}`);
        continue;
      }

      const existingUser = await this.userRepository.findOne({
        where: { email: userData.email },
        withDeleted: false,
      });

      if (existingUser) {
        this.logger.log(`User ${userData.email} already exists, updating password...`);
        existingUser.password = await this.hashPassword(userData.password);
        await this.userRepository.save(existingUser);
        this.logger.log(`Updated password for ${userData.email}`);
        continue;
      }

      let role = null;
      if (userData.roleName) {
        role = await this.roleRepository.findOne({
          where: { name: userData.roleName },
        });
        if (!role) {
          this.logger.warn(`Role ${userData.roleName} not found, creating user without role`);
        }
      }

      const hashedPassword = await this.hashPassword(userData.password);

      const user = this.userRepository.create({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: role,
        isActive: true,
        otp: null,
        otpExpired: null,
      });

      await this.userRepository.save(user);
      this.logger.log(`Created default ${userData.roleName} user: ${userData.email}`);
    }
  }
}