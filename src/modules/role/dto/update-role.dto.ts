import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsInt } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  permissionIds?: number[];
}
