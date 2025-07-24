import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from 'src/entities/permission.entity';
import { Repository } from 'typeorm';
import { CreatePermissionDto } from './dto/permission.dto';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async findAll(): Promise<Permission[]> {
    return this.permissionRepository.find();
  }

  async findOne(id: number): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });
    if (!permission)
      throw new NotFoundException(`Permission with ID ${id} not found`);
    return permission;
  }

  async create(data: CreatePermissionDto): Promise<Permission> {
    const exestingPermission = await this.permissionRepository.findOne({
      where: { action: data.action },
    });
    if (exestingPermission) {
      throw new NotFoundException('Permission action existed');
    }
    const permission = this.permissionRepository.create(data);
    return this.permissionRepository.save(permission);
  }

  async delete(id: number): Promise<void> {
    const result = await this.permissionRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`Permission not found`);
  }
}
