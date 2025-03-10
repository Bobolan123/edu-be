import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { Role } from 'src/entities/role.entity';

const passwordRegEx =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

export class CreateUserDto {
  @IsOptional()
  @IsString()
  googleId?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2, { message: 'Name must have at least 2 characters.' })
  name: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Please provide a valid Email.' })
  email: string;

  @IsOptional() 
  @Matches(passwordRegEx, {
    message: `Password must be between 8-20 characters, include at least one uppercase letter, 
    one lowercase letter, one number, and one special character.`,
  })
  password?: string;

  @IsOptional()
  @IsString()
  profile_picture?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsBoolean()
  has_active_subscription?: boolean;

  @IsOptional()
  @IsInt()
  otp?: number;

  @IsOptional()
  @IsDate()
  otpExpired?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional() 
  role?: Role;
}
