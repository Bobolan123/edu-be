import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from 'src/entities/category.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { PageMetaDto } from 'src/common/dtos/page-meta.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';
import { CategoryWithCountDto } from './dto/category-with-count.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async findAll(
    pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<CategoryWithCountDto>> {
    // First, get all categories with pagination
    const categoryQuery = this.categoryRepository.createQueryBuilder('category');

    if (pageOptionsDto.search) {
      categoryQuery.where('category.name ILIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    categoryQuery
      .orderBy(
        `category.${pageOptionsDto?.orderBy || 'id'}`,
        pageOptionsDto?.order,
      )
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [categories, totalCount] = await categoryQuery.getManyAndCount();

    // Get course counts for each category
    const categoryIds = categories.map(cat => cat.id);
    let courseCounts: { [key: number]: number } = {};

    if (categoryIds.length > 0) {
      const countQuery = await this.categoryRepository
        .createQueryBuilder('category')
        .leftJoin('category.courses', 'course')
        .select('category.id', 'categoryId')
        .addSelect('COUNT(course.id)', 'courseCount')
        .where('category.id IN (:...categoryIds)', { categoryIds })
        .groupBy('category.id')
        .getRawMany();

      courseCounts = countQuery.reduce((acc, item) => {
        acc[item.categoryId] = parseInt(item.courseCount) || 0;
        return acc;
      }, {});
    }

    // Combine categories with their course counts
    const items = categories.map(category => 
      new CategoryWithCountDto({
        id: category.id,
        name: category.name,
        description: category.description,
        courseCount: courseCounts[category.id] || 0
      })
    );

    const pageMetaDto = new PageMetaDto({
      itemCount: totalCount,
      pageOptionsDto,
    });

    return { result: items, meta: pageMetaDto };
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
