import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { RoleService } from './role.service';
import { Role } from 'src/entities/role.entity';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  async findAll(): Promise<Role[]> {
    return this.roleService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<Role> {
    return this.roleService.findOne(id);
  }

  @Post()
  async create(@Body('name') name: string): Promise<Role> {
    return this.roleService.create(name);
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    return this.roleService.delete(id);
  }
}
