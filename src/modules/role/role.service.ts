import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from 'src/entities/permission.entity';
import { Role } from 'src/entities/role.entity';
import { Repository, Not } from 'typeorm';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find({ relations: ['permissions'] });
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
    return role;
  }

  async create(name: string, description?: string, isActive: boolean = true): Promise<Role> {
    const isExist = await this.roleRepository.findOneBy({ name });
    if (isExist) {
      throw new BadRequestException('Role already exists');
    }
    const role = this.roleRepository.create({ name, description, isActive });
    return this.roleRepository.save(role);
  }

  async update(id: number, name: string, description?: string, isActive?: boolean): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);

    const existingRole = await this.roleRepository.findOne({
      where: { name, id: Not(id) },
    });
    if (existingRole) {
      throw new BadRequestException('Role name already exists');
    }

    role.name = name;
    if (description !== undefined) role.description = description;
    if (isActive !== undefined) role.isActive = isActive;
    return this.roleRepository.save(role);
  }

  async delete(id: number): Promise<void> {
    const result = await this.roleRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Role not found`);
  }

  async updateRolePermissions(
    roleId: number,
    permissionIds: number[], 
  ): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Find permissions by the given IDs
    const permissions =
      await this.permissionRepository.findByIds(permissionIds);
    if (permissions.length !== permissionIds.length) {
      throw new NotFoundException('Some permissions not found');
    }

    // Update the role with new permissions
    role.permissions = permissions;
    return this.roleRepository.save(role);
  }
}
