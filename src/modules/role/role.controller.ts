import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Put,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { Role } from 'src/entities/role.entity';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';
import { UpdateRolePermissionsDto } from './dto/updateRolePermission.dto';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @ResponseMessage('View Roles')
  @Get()
  async findAll(): Promise<Role[]> {
    return this.roleService.findAll();
  }

  @ResponseMessage('View one Role')
  @Get(':id')
  async findOne(@Param('id') id: number): Promise<Role> {
    return this.roleService.findOne(id);
  }

  @ResponseMessage('Create new Role')
  @Post()
  async create(@Body('name') name: string): Promise<Role> {
    return this.roleService.create(name);
  }

  @ResponseMessage('Delete Role')
  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    return this.roleService.delete(id);
  }

  @ResponseMessage('Update role permissions')
  @Put('permissions')
  async updatePermissions(@Body() dto: UpdateRolePermissionsDto) {
    return this.roleService.updateRolePermissions(
      dto.roleId,
      dto.permissionIds,
    );
  }
}
