import { Transform } from 'class-transformer';
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

  @Matches(passwordRegEx, {
    message: `Password must be between 8-20 characters, include at least one uppercase letter, 
    one lowercase letter, one number, and one special character.`,
  })
  password?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

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
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  isActive?: boolean;

  @IsOptional()
  role?: Role;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  roleId?: number;
}
