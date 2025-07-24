import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from 'src/entities/review.entity';
import { Course } from 'src/entities/course.entity';
import { User } from 'src/entities/user.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { PageMetaDto } from 'src/common/dtos/page-meta.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  // ────────────────────────────────
  // 🔎 Generic Pagination Helper
  private async paginateQuery(
    queryBuilder: ReturnType<Repository<Review>['createQueryBuilder']>,
    pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Review>> {
    const allowedOrderFields = ['id', 'rating', 'date_reviewed'];
    const orderBy = allowedOrderFields.includes(pageOptionsDto.orderBy)
      ? pageOptionsDto.orderBy
      : 'date_reviewed';

    queryBuilder
      .orderBy(`review.${orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();
    const meta = new PageMetaDto({ itemCount, pageOptionsDto });

    return { result: items, meta };
  }

  // ────────────────────────────────
  // 🔄 CRUD
  async findAll(pageOptionsDto: PageOptionsDto) {
    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.course', 'course');

    if (pageOptionsDto.search) {
      qb.where('review.comment LIKE :search OR course.title LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    return this.paginateQuery(qb, pageOptionsDto);
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

  // ────────────────────────────────
  // 🔎 Query by Course / User
  async findByCourse(courseId: number, pageOptionsDto: PageOptionsDto) {
    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.course', 'course')
      .where('course.id = :courseId', { courseId });

    if (pageOptionsDto.search) {
      qb.andWhere('review.comment LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    return this.paginateQuery(qb, pageOptionsDto);
  }

  async findByUser(userId: number, pageOptionsDto: PageOptionsDto) {
    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.course', 'course')
      .where('user.id = :userId', { userId });

    if (pageOptionsDto.search) {
      qb.andWhere('review.comment LIKE :search OR course.title LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    return this.paginateQuery(qb, pageOptionsDto);
  }

  // ────────────────────────────────
  // ⭐ Add or Update Review
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

  // ────────────────────────────────
  // 📊 Course Rating & Distribution
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
