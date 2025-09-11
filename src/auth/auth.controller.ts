import {
  Controller,
  Post,
  Request,
  UseGuards,
  Get,
  Body,
  Res,
  Put,
  Patch,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './Public';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';
import { Request as ReqExpress, Response } from 'express';
import { AuthChangePassword, AuthVerifiedOtp } from './dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private jwtService: JwtService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @ResponseMessage('User Login')
  @Post('login')
  async login(@Request() req, @Res({ passthrough: true }) res: Response) {
    return await this.authService.login(req.user, res);
  }

  @Public()
  @ResponseMessage('User Register')
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Public()
  @ResponseMessage('Verify OTP vie email')
  @Post('verifyOtp')
  async resendOtp(@Body() data: AuthVerifiedOtp) {
    return this.authService.verifyOtp(data);
  }

  @Public()
  @ResponseMessage('Resend OTP')
  @Post('resendOtp')
  async verifyOtp(@Body() data: AuthVerifiedOtp) {
    return this.authService.resendOtp(data);
  }

  @Public()
  @ResponseMessage('Refresh token')
  @Post('refresh')
  refreshToken(
    @Request() req: ReqExpress,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refresh_token = req.cookies['refresh_token'];
    return this.authService.refreshToken(refresh_token, res);
  }

  @ResponseMessage('User information')
  @Get('profile')
  profile(@Request() req) {
    console.log('req.user', req.user);
    return req.user;
  }

  @Public()
  @ResponseMessage('Forget password')
  @Patch('forgetPassword')
  forgetPassword(@Body() data: AuthChangePassword) {
    return this.authService.forgetPassword(data);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Redirects user to Google authentication
  }

  @Public()
  @Post('google-login')
  async googleLogin(
    @Body() userData: { email: string; name: string; googleId: string },
  ) {
    return this.authService.googleLogin(userData);
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const user = req.user;

    // Generate JWT token for frontend authentication
    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    // Set HTTP-Only Cookie
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      sameSite: 'strict',
      maxAge:
        process.env.JWT_ACCESS_EXPIRATION_COOKIE || 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.redirect(`http://localhost:3000`);
  }
}
