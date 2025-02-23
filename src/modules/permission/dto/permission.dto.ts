import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsNotEmpty()
  module: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class UpdatePermissionDto {
  @IsString()
  @IsNotEmpty()
  action?: string;

  @IsString()
  @IsNotEmpty()
  module?: string;

  @IsString()
  @IsNotEmpty()
  description?: string;
}
