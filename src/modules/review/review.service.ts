import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from 'src/entities/review.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { PageMetaDto } from 'src/common/dtos/page-meta.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
  ) {}

  async findAll(pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Review>> {
    const queryBuilder = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.course', 'course');

    if (pageOptionsDto.search) {
      queryBuilder.where('review.content LIKE :search OR course.title LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    queryBuilder
      .orderBy(`review.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { result: items, meta: pageMetaDto };
  }

  async findOne(id: number): Promise<Review> {
    return this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'course'],
    });
  }

  async create(review: Partial<Review>): Promise<Review> {
    const newReview = this.reviewRepository.create(review);
    return this.reviewRepository.save(newReview);
  }

  async update(id: number, review: Partial<Review>): Promise<Review> {
    await this.reviewRepository.update(id, review);
    return this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'course'],
    });
  }

  async delete(id: number): Promise<void> {
    await this.reviewRepository.delete(id);
  }

  async findByCourse(courseId: number, pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Review>> {
    const queryBuilder = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.course', 'course')
      .where('course.id = :courseId', { courseId });

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('review.content LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    queryBuilder
      .orderBy(`review.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { result: items, meta: pageMetaDto };
  }

  async findByUser(userId: number, pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Review>> {
    const queryBuilder = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.course', 'course')
      .where('user.id = :userId', { userId });

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('review.content LIKE :search OR course.title LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    queryBuilder
      .orderBy(`review.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { result: items, meta: pageMetaDto };
  }
} 