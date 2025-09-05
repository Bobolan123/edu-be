import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from 'src/entities/permission.entity';
import { Repository, DataSource } from 'typeorm';
import { CreatePermissionDto, UpdatePermissionDto } from './dto/permission.dto';
import { PermissionFilterDto } from './dto/permission-filter.dto';
import { PageMetaDto, ResponsePaginate } from 'src/common/dtos';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private dataSource: DataSource,
  ) {}

  async findAll(): Promise<Permission[]> {
    return this.permissionRepository.find();
  }

  async findAllPaginated(filterDto: PermissionFilterDto): Promise<ResponsePaginate<Permission>> {
    const queryBuilder = this.permissionRepository.createQueryBuilder('permission');

    // Apply filters
    if (filterDto.search) {
      queryBuilder.andWhere(
        '(permission.api ILIKE :search OR permission.description ILIKE :search OR permission.module ILIKE :search)',
        { search: `%${filterDto.search}%` }
      );
    }

    if (filterDto.api) {
      queryBuilder.andWhere('permission.api ILIKE :api', { api: `%${filterDto.api}%` });
    }

    if (filterDto.description) {
      queryBuilder.andWhere('permission.description ILIKE :description', { 
        description: `%${filterDto.description}%` 
      });
    }

    if (filterDto.method) {
      queryBuilder.andWhere('permission.method = :method', { method: filterDto.method });
    }

    if (filterDto.module) {
      queryBuilder.andWhere('permission.module ILIKE :module', { 
        module: `%${filterDto.module}%` 
      });
    }

    // Apply ordering
    if (filterDto.orderBy && filterDto.order) {
      queryBuilder.orderBy(`permission.${filterDto.orderBy}`, filterDto.order);
    } else {
      queryBuilder.orderBy('permission.id', 'DESC');
    }

    // Apply pagination
    queryBuilder.skip(filterDto.skip).take(filterDto.take);

    const [permissions, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({ pageOptionsDto: filterDto, itemCount });

    return new ResponsePaginate(permissions, pageMetaDto);
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
    const permission = await this.findOne(id);
    
    // Use query runner to handle the deletion with proper transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // First remove the permission from all roles (delete from join table)
      await queryRunner.query(
        'DELETE FROM role_permission WHERE "permissionId" = $1',
        [id]
      );
      
      // Then delete the permission
      await queryRunner.manager.delete(Permission, id);
      
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
