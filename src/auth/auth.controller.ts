import { Controller, Post, Request, UseGuards, Get, Body, Res, Put, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './Public';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';
import { Request as ReqExpress} from 'express';
import { AuthChangePassword, AuthVerifiedOtp } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @ResponseMessage('User Login')
  @Post('login')
  async login(@Request() req) {
    return await this.authService.login(req.user);
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
  ) {
    const refresh_token = req.cookies['refresh_token'];
    return this.authService.refreshToken(refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @ResponseMessage('User information')
  @Get('profile')
  profile(@Request() req) {
    return req.user;
  } 

  @ResponseMessage('Forget password')
  @Patch('forgetPassword')
  forgetPassword(@Body() data:AuthChangePassword) {
    return this.authService.forgetPassword(data)
  }
}
