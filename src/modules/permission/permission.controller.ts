import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { PermissionService } from './permission.service';
import { Permission } from 'src/entities/permission.entity';
import { CreatePermissionDto, UpdatePermissionDto } from './dto/permission.dto';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';

@Controller('permission')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @ResponseMessage('Get permissions')
  @Get()
  async findAll(): Promise<Permission[]> {
    return this.permissionService.findAll();
  }

  @ResponseMessage('Get permission')
  @Get(':id')
  async findOne(@Param('id') id: number): Promise<Permission> {
    return this.permissionService.findOne(id);
  }

  @ResponseMessage('Create permission')
  @Post()
  async create(@Body() data: CreatePermissionDto): Promise<Permission> {
    return this.permissionService.create(data);
  }

  @ResponseMessage('Update permission')
  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() data: UpdatePermissionDto,
  ): Promise<Permission> {
    return this.permissionService.update(id, data);
  }

  @ResponseMessage('Delete permission')
  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    return this.permissionService.delete(id);
  }
}
