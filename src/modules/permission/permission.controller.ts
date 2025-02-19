import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { Permission } from 'src/entities/permission.entity';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  async findAll(): Promise<Permission[]> {
    return this.permissionService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<Permission> {
    return this.permissionService.findOne(id);
  }

  @Post()
  async create(@Body('action') action: string): Promise<Permission> {
    return this.permissionService.create(action);
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    return this.permissionService.delete(id);
  }
}
