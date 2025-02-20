import { ConfigService } from '@nestjs/config';
import { BadRequestException, Body, Injectable, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from 'src/entities/user.entity';
import { UserService } from 'src/modules/user/user.service';
import { Public } from './Public';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService
  ) {}

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  async comparePassword(
    password: string,
    storePasswordHash: string,
  ): Promise<any> {
    return await bcrypt.compare(password, storePasswordHash);
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    const check = await this.comparePassword(password, user.password);

    if (!user || !check) {
      return false;
    }

    return user;
  }

  async login(user: User) {
    const isActiveGmail = await this.userService.isActiveGmail(user.email);
    if (isActiveGmail !== true) {
      throw new BadRequestException('Email is not verified');
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions,
    };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });
    return {
      access_token,refresh_token
    }
  }

  async register(user: CreateUserDto) {
    const res = await this.userService.create(user);
    if (!res) {
      throw new BadRequestException(`The ${user.email} exists`);
    }
    return res;
  }
}
