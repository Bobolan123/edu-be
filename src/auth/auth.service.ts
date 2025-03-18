import { ConfigService } from '@nestjs/config';
import { BadRequestException, Body, HttpException, HttpStatus, Injectable, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from 'src/entities/user.entity';
import { UserService } from 'src/modules/user/user.service';
import { Public } from './Public';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';
import { AuthChangePassword, AuthVerifiedOtp } from './dto/auth.dto';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
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
    const check = user && (await this.comparePassword(password, user.password));

    if (!user || !check) {
      throw new BadRequestException('Invalid credentials');
    }

    return user;
  }

  async login(user: User, response: Response) {
    const isActiveGmail = await this.userService.isActiveGmail(user.email);
    if (isActiveGmail !== true) {
      throw new HttpException('Email is not verified', HttpStatus.FORBIDDEN);
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
    };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });
    response.clearCookie('refresh_token');
    //set refresh token in cookie
    response.cookie('refresh_token', refresh_token, {
      maxAge: this.configService.get<number>('JWT_REFRESH_EXPIRATION_COOKIE'),
      httpOnly: true,
    });

    response.cookie('access_token', access_token, {
      maxAge: this.configService.get<number>('JWT_ACCESS_EXPIRATION_COOKIE'),
    });
    return {
      email: user.email,
      name: user.name,
      id: user.id,
      role: user.role?.name,
      access_token,
    };
  }

  async register(user: CreateUserDto) {
    const res = await this.userService.create(user);
    if (!res) {
      throw new BadRequestException(`The ${user.email} exists`);
    }
    return res;
  }

  async verifyOtp(data: AuthVerifiedOtp) {
    const res = await this.userService.verifyOtp(data);
    return res;
  }

  async resendOtp(data: AuthVerifiedOtp) {
    const res = await this.userService.resendOtp(data.email);
    return res;
  }

  async refreshToken(refresh_token: string, response:Response) {
    try {
      const decoded_token = this.jwtService.verify(refresh_token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.userService.findOneByToken(decoded_token?.id);
      if (user) {
        const res = this.login(user, response);
        return res;
      } else {
        throw new BadRequestException(
          'Refresh token are not valid. Login please',
        );
      }
    } catch (error) {
      console.log(error);
    }
  }

  async forgetPassword(data: AuthChangePassword) {
    try {
      const user = this.userService.changePassword(data);
      return user;
    } catch (error) {
      console.log(error);
    }
  }

  async googleLogin(userData: { email: string; name: string; googleId: string }) {
    let user = await this.userService.findByEmail(userData.email);
    if (!user) {
        // If the user doesn't exist, create a new one
        user = await this.userService.create({
            email: userData.email,
            name: userData.name,
            googleId: userData.googleId,
        });
    }

    return user
}
}
