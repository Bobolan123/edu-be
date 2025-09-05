import { IsOptional, IsString, IsIn } from 'class-validator';
import { PageOptionsDto } from 'src/common/dtos';

export class PermissionFilterDto extends PageOptionsDto {
  @IsOptional()
  @IsString()
  api?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method?: string;

  @IsOptional()
  @IsString()
  module?: string;
}