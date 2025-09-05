import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsOptional()
  api?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method?: string;

  @IsString()
  @IsOptional()
  module?: string;
}

export class UpdatePermissionDto {
  @IsString()
  @IsOptional()
  api?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method?: string;

  @IsString()
  @IsOptional()
  module?: string;
}
