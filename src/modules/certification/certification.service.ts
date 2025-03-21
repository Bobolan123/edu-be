import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certification } from 'src/entities/certification.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { PageMetaDto } from 'src/common/dtos/page-meta.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';

@Injectable()
export class CertificationService {
  constructor(
    @InjectRepository(Certification)
    private certificationRepository: Repository<Certification>,
  ) {}

  async findAll(pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Certification>> {
    const queryBuilder = this.certificationRepository
      .createQueryBuilder('certification')
      .leftJoinAndSelect('certification.user', 'user')
      .leftJoinAndSelect('certification.course', 'course');

    if (pageOptionsDto.search) {
      queryBuilder.where('course.title LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    queryBuilder
      .orderBy(`certification.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { data: items, meta: pageMetaDto };
  }

  async findOne(id: number): Promise<Certification> {
    return this.certificationRepository.findOne({
      where: { id },
      relations: ['user', 'course'],
    });
  }

  async create(certification: Partial<Certification>): Promise<Certification> {
    const newCertification = this.certificationRepository.create(certification);
    return this.certificationRepository.save(newCertification);
  }

  async findByUser(userId: number, pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Certification>> {
    const queryBuilder = this.certificationRepository
      .createQueryBuilder('certification')
      .leftJoinAndSelect('certification.user', 'user')
      .leftJoinAndSelect('certification.course', 'course')
      .where('user.id = :userId', { userId });

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('course.title LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    queryBuilder
      .orderBy(`certification.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { data: items, meta: pageMetaDto };
  }

  async findByCourse(courseId: number, pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Certification>> {
    const queryBuilder = this.certificationRepository
      .createQueryBuilder('certification')
      .leftJoinAndSelect('certification.user', 'user')
      .leftJoinAndSelect('certification.course', 'course')
      .where('course.id = :courseId', { courseId });

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('user.name LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    queryBuilder
      .orderBy(`certification.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { data: items, meta: pageMetaDto };
  }

  async verify(id: number): Promise<Certification> {
    const certification = await this.findOne(id);
    if (!certification) {
      return null;
    }
    return certification;
  }
} 