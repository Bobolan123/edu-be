import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from 'src/entities/permission.entity';
import { Repository } from 'typeorm';
import { CreatePermissionDto, UpdatePermissionDto } from './dto/permission.dto';

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
    if (data.api && data.method) {
      const existingPermission = await this.permissionRepository.findOne({
        where: { api: data.api, method: data.method },
      });
      if (existingPermission) {
        throw new ConflictException(
          'Permission with this API and method combination already exists',
        );
      }
    }
    const permission = this.permissionRepository.create(data);
    return this.permissionRepository.save(permission);
  }

  async update(id: number, data: UpdatePermissionDto): Promise<Permission> {
    const permission = await this.findOne(id);

    if (data.api || data.method) {
      const existingPermission = await this.permissionRepository.findOne({
        where: {
          api: data.api || permission.api,
          method: data.method || permission.method,
        },
      });
      if (existingPermission && existingPermission.id !== id) {
        throw new ConflictException(
          'Permission with this API and method combination already exists',
        );
      }
    }

    Object.assign(permission, data);
    return this.permissionRepository.save(permission);
  }

  async delete(id: number): Promise<void> {
    const result = await this.permissionRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`Permission not found`);
  }
}
