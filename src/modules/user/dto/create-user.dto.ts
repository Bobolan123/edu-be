import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { Role } from 'src/entities/role.entity';

const passwordRegEx =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2, { message: 'Name must have at least 2 characters.' })
  name: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Please provide a valid Email.' })
  email: string;

  @IsNotEmpty()
  @Matches(passwordRegEx, {
    message: `Password must be between 8-20 characters, include at least one uppercase letter, 
    one lowercase letter, one number, and one special character.`,
  })
  password: string;

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

  @IsNotEmpty()
  role: Role;
}
