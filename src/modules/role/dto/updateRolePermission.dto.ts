import { IsArray, IsInt, ArrayNotEmpty } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsInt()
  roleId: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true }) // Ensure each item in the array is an integer
  permissionIds: number[];
}
