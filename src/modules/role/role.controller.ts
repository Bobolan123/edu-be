import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { Role } from 'src/entities/role.entity';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Permissions } from 'src/decorator/requirePermission.decorator';

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
  async create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    return this.roleService.create(createRoleDto);
  }

  @ResponseMessage('Update Role')
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<Role> {
    return this.roleService.update(id, updateRoleDto);
  }

  @ResponseMessage('Delete Role')
  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    return this.roleService.delete(id);
  }
}
