import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from 'src/entities/permission.entity';
import { Repository } from 'typeorm';

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
    const permission = await this.permissionRepository.findOne({ where: { id } });
    if (!permission) throw new NotFoundException(`Permission with ID ${id} not found`);
    return permission;
  }

  async create(action: string): Promise<Permission> {
    const permission = this.permissionRepository.create({ action });
    return this.permissionRepository.save(permission);
  }

  async delete(id: number): Promise<void> {
    const result = await this.permissionRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Permission not found`);
  }
}
