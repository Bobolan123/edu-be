import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from 'src/entities/user.entity';
import { UserService } from 'src/modules/user/user.service';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';
import {
  AuthChangePassword,
  AuthVerifiedOtp,
  AuthResendOtp,
} from './dto/auth.dto';

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
    console.log('email', email);
    console.log('password', password);
    const user = await this.userService.findByEmail(email);
    const check = user && (await this.comparePassword(password, user.password));

    if (!user || !check) {
      throw new BadRequestException('Invalid credentials');
    }

    return user;
  }

  async login(user: User) {
    const isActiveGmail = await this.userService.isActiveGmail(user.email);
    if (isActiveGmail !== true) {
      throw new HttpException('Email is not verified', HttpStatus.FORBIDDEN);
    }

    const permissions =
      user.role?.permissions?.map((permission) => ({
        id: permission.id,
        api: permission.api,
        description: permission.description,
        method: permission.method,
        module: permission.module,
      })) || [];

    // JWT payload - only essential identity info (no permissions)
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role?.name,
      avatar_url: user.avatar_url,
    };
    // Get expiration in milliseconds and convert to seconds for JWT
    const accessTokenExpirationMs = Number(
      this.configService.get<number>('JWT_ACCESS_EXPIRATION'),
    );
    const refreshTokenExpirationMs = Number(
      this.configService.get<number>('JWT_REFRESH_EXPIRATION'),
    );
    const accessTokenExpirationSec = Math.floor(accessTokenExpirationMs / 1000);
    const refreshTokenExpirationSec = Math.floor(
      refreshTokenExpirationMs / 1000,
    );

    const access_token = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpirationSec, // Convert ms to seconds
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
    });
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: refreshTokenExpirationSec, // Convert ms to seconds
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });

    // Calculate expiration timestamp in milliseconds for FE
    const expires_at = Date.now() + accessTokenExpirationMs;

    return {
      email: user.email,
      name: user.name,
      id: user.id,
      role: user.role?.name,
      access_token,
      refresh_token,
      expires_at, // Timestamp in milliseconds for FE to check expiry
      permissions: permissions,
      avatar_url: user.avatar_url,
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

  async resendOtp(data: AuthResendOtp) {
    const res = await this.userService.resendOtp(data.email);
    return res;
  }

  async refreshToken(refresh_token: string) {
    if (!refresh_token) {
      throw new BadRequestException('Refresh token not provided');
    }

    try {
      const decoded_token = this.jwtService.verify(refresh_token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.userService.findOneByToken(decoded_token?.id);
      if (!user) {
        throw new BadRequestException(
          'Refresh token is not valid. Please login',
        );
      }
      return await this.login(user);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new HttpException(
          'Refresh token expired. Please login',
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw error;
    }
  }

  async forgetPassword(data: AuthChangePassword) {
    return await this.userService.changePassword(data);
  }

  async googleLogin(userData: {
    email: string;
    name: string;
    googleId: string;
  }) {
    let user = await this.userService.findByEmail(userData.email);

    if (user) {
      // User exists - link Google account if not already linked
      if (!user.googleId) {
        user.googleId = userData.googleId;
        user.isActive = true; // Auto-activate since Google verified
        await this.userService.update(user.id, {
          googleId: userData.googleId,
          isActive: true
        });
      }
      return user;
    } else {
      // Create new user with Google
      user = await this.userService.create({
        email: userData.email,
        name: userData.name,
        googleId: userData.googleId,
      });
      return user;
    }
  }
}
