import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Section } from 'src/entities/section.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { PageMetaDto } from 'src/common/dtos/page-meta.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';

@Injectable()
export class SectionService {
  constructor(
    @InjectRepository(Section)
    private sectionRepository: Repository<Section>,
  ) {}

  async findAll(pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Section>> {
    const queryBuilder = this.sectionRepository
      .createQueryBuilder('section')
      .leftJoinAndSelect('section.course', 'course')
      .leftJoinAndSelect('section.lessons', 'lessons');

    if (pageOptionsDto.search) {
      queryBuilder.where('section.title LIKE :search OR course.title LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    queryBuilder
      .orderBy(`section.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { data: items, meta: pageMetaDto };
  }

  async findOne(id: number): Promise<Section> {
    return this.sectionRepository.findOne({
      where: { id },
      relations: ['course', 'lessons'],
    });
  }

  async create(section: Partial<Section>): Promise<Section> {
    const newSection = this.sectionRepository.create(section);
    return this.sectionRepository.save(newSection);
  }

  async update(id: number, section: Partial<Section>): Promise<Section> {
    await this.sectionRepository.update(id, section);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.sectionRepository.delete(id);
  }

  async findByCourse(courseId: number): Promise<Section[]> {
    return  await this.sectionRepository.find({
      where: { course: { id: courseId } },
      relations: ['lessons'],
    });
  }
} 