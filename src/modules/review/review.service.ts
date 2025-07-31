import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from 'src/entities/review.entity';
import { Course } from 'src/entities/course.entity';
import { User } from 'src/entities/user.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { PageMetaDto } from 'src/common/dtos/page-meta.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';
import { ReviewFilterDto, ReviewSortBy } from './dto/review-filter.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  private async paginateQuery(
    queryBuilder: ReturnType<Repository<Review>['createQueryBuilder']>,
    pageOptionsDto: PageOptionsDto | ReviewFilterDto,
  ): Promise<ResponsePaginate<Review>> {
    const filterDto = pageOptionsDto as ReviewFilterDto;

    if (filterDto.sortBy) {
      switch (filterDto.sortBy) {
        case ReviewSortBy.NEWEST:
          queryBuilder.orderBy('review.date_reviewed', 'DESC');
          break;
        case ReviewSortBy.OLDEST:
          queryBuilder.orderBy('review.date_reviewed', 'ASC');
          break;
        case ReviewSortBy.HIGHEST_RATING:
          queryBuilder.orderBy('review.rating', 'DESC');
          break;
        case ReviewSortBy.LOWEST_RATING:
          queryBuilder.orderBy('review.rating', 'ASC');
          break;
        default:
          queryBuilder.orderBy('review.date_reviewed', 'DESC');
      }
    } else {
      const allowedOrderFields = ['id', 'rating', 'date_reviewed'];
      const orderBy = allowedOrderFields.includes(pageOptionsDto.orderBy)
        ? pageOptionsDto.orderBy
        : 'date_reviewed';
      queryBuilder.orderBy(`review.${orderBy}`, pageOptionsDto.order);
    }

    queryBuilder.skip(pageOptionsDto.skip).take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();
    const meta = new PageMetaDto({ itemCount, pageOptionsDto });

    return { result: items, meta };
  }

  private applyFilters(
    queryBuilder: ReturnType<Repository<Review>['createQueryBuilder']>,
    filterDto: ReviewFilterDto,
  ) {
    if (filterDto.rating) {
      queryBuilder.andWhere('review.rating = :rating', {
        rating: filterDto.rating,
      });
    }

    if (filterDto.minRating) {
      queryBuilder.andWhere('review.rating >= :minRating', {
        minRating: filterDto.minRating,
      });
    }

    if (filterDto.maxRating) {
      queryBuilder.andWhere('review.rating <= :maxRating', {
        maxRating: filterDto.maxRating,
      });
    }

    if (filterDto.search) {
      queryBuilder.andWhere(
        'review.comment LIKE :search OR course.title LIKE :search',
        {
          search: `%${filterDto.search}%`,
        },
      );
    }
  }

  async findAll(reviewFilterDto: ReviewFilterDto) {
    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.course', 'course');

    this.applyFilters(qb, reviewFilterDto);

    return this.paginateQuery(qb, reviewFilterDto);
  }

  async findOne(id: number) {
    return this.reviewRepo.findOne({
      where: { id },
      relations: ['user', 'course'],
    });
  }

  async create(review: Partial<Review>) {
    return this.reviewRepo.save(this.reviewRepo.create(review));
  }

  async update(id: number, review: Partial<Review>) {
    await this.reviewRepo.update(id, review);
    return this.findOne(id);
  }

  async delete(id: number) {
    await this.reviewRepo.delete(id);
  }

  async findByCourse(courseId: number, reviewFilterDto: ReviewFilterDto) {
    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoin('review.course', 'course')
      .where('course.id = :courseId', { courseId });

    this.applyFilters(qb, reviewFilterDto);

    const paginatedReviews = await this.paginateQuery(qb, reviewFilterDto);

    return paginatedReviews;
  }

  async findByUser(userId: number, reviewFilterDto?: ReviewFilterDto) {
    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.course', 'course')
      .where('user.id = :userId', { userId });

    if (reviewFilterDto) {
      this.applyFilters(qb, reviewFilterDto);
    }

    return this.paginateQuery(qb, reviewFilterDto);
  }

  async addOrUpdateReview(
    userId: number,
    courseId: number,
    rating: number,
    comment?: string,
  ) {
    const user = await this.userRepo.findOneBy({ id: userId });
    const course = await this.courseRepo.findOne({
      where: { id: courseId },
      relations: ['reviews'],
    });

    if (!user || !course) {
      throw new BadRequestException('User or Course not found');
    }

    let review = await this.reviewRepo.findOne({
      where: { user: { id: userId }, course: { id: courseId } },
    });

    if (review) {
      review.rating = rating;
      review.comment = comment ?? review.comment;
    } else {
      review = this.reviewRepo.create({ user, course, rating, comment });
    }

    await this.reviewRepo.save(review);
    await this.recalculateCourseAverage(courseId);

    return review;
  }

  private async getAverageRating(courseId: number): Promise<number> {
    const { avg } = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .where('review.courseId = :courseId', { courseId })
      .getRawOne();

    return parseFloat(Number(avg ?? 0).toFixed(1));
  }

  private async recalculateCourseAverage(courseId: number) {
    const { avg, count } = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.courseId = :courseId', { courseId })
      .getRawOne();

    await this.courseRepo.update(courseId, {
      average_rating: parseFloat(Number(avg ?? 0).toFixed(2)),
      total_reviews: parseInt(count ?? 0),
    });
  }

  async getRatingDistribution(courseId: number) {
    const total = await this.reviewRepo.count({
      where: { course: { id: courseId } },
    });

    const raw = await this.reviewRepo
      .createQueryBuilder('review')
      .select('review.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('review.courseId = :courseId', { courseId })
      .groupBy('review.rating')
      .getRawMany();

    const counts = [0, 0, 0, 0, 0]; // index 0 = 1 star, index 4 = 5 stars

    raw.forEach(({ rating, count }) => {
      const index = Number(rating) - 1;
      if (index >= 0 && index < 5) counts[index] = Number(count);
    });

    const distribution = counts
      .map((count, i) => ({
        stars: i + 1,
        count,
        percentage: total ? Math.round((count / total) * 100) : 0,
      }))
      .reverse();

    return {
      average_rating: await this.getAverageRating(courseId),
      total_reviews: total,
      distribution,
    };
  }
}
