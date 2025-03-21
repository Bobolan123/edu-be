import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from 'src/entities/category.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { PageMetaDto } from 'src/common/dtos/page-meta.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async findAll(pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Category>> {
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    if (pageOptionsDto.search) {
      queryBuilder.where('category.name LIKE :search', { search: `%${pageOptionsDto.search}%` });
    }

    queryBuilder
      .orderBy(`category.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return {data: items, meta: pageMetaDto};
  }

  async findOne(id: number): Promise<Category> {
    return this.categoryRepository.findOne({ where: { id } });
  }

  async create(category: Partial<Category>): Promise<Category> {
    const newCategory = this.categoryRepository.create(category);
    return this.categoryRepository.save(newCategory);
  }

  async update(id: number, category: Partial<Category>): Promise<Category> {
    await this.categoryRepository.update(id, category);
    return this.categoryRepository.findOne({ where: { id } });
  }

  async delete(id: number): Promise<void> {
    await this.categoryRepository.delete(id);
  }
} 