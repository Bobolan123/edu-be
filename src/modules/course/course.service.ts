import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from '../../entities/course.entity';
import { CourseLecture } from '../../entities/course-lecture.entity';
import { User } from 'src/entities/user.entity';
import { Category } from 'src/entities/category.entity';
import { Enrollment } from 'src/entities/enrollment.entity';
import { LectureProgress } from 'src/entities/lecture-progress.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PageMetaDto, PageOptionsDto, ResponsePaginate } from 'src/common/dtos';
import { CourseSearchFilterDto } from './dto/course-search-filter.dto';
import { ReviewService } from '../review/review.service';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,


    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,

    @InjectRepository(LectureProgress)
    private readonly lectureProgressRepository: Repository<LectureProgress>,

    private cloudinaryService: CloudinaryService,


    private readonly reviewService: ReviewService,
  ) {}

  async create(createCourseDto: CreateCourseDto) {
    const { title, instructorId, categoryIds, ...rest } = createCourseDto;

    const courseExists = await this.courseRepository.findOne({
      where: { title },
      withDeleted: false,
    });
    if (courseExists) {
      throw new BadRequestException(`The course "${title}" already exists.`);
    }

    const instructor = await this.userRepository.findOne({
      where: { id: instructorId },
      withDeleted: false,
    });
    if (!instructor) {
      throw new BadRequestException(
        `Instructor with ID ${instructorId} not found.`,
      );
    }

    let categories = [];
    if (categoryIds?.length) {
      categories = await this.categoryRepository.findByIds(categoryIds);
      if (categories.length !== categoryIds.length) {
        throw new BadRequestException('One or more category IDs are invalid.');
      }
    }

    const course = this.courseRepository.create({
      ...rest,
      title,
      instructor,
      categories,
    });

    return await this.courseRepository.save(course);
  }

  async findAll(
    filterDto: CourseSearchFilterDto,
  ): Promise<ResponsePaginate<Course>> {
    const queryBuilder = this.buildCourseQuery(filterDto);
    const allMatchingCourses = await queryBuilder.getMany();

    const processedCourses = await this.processCoursesWithFilters(
      allMatchingCourses,
      filterDto,
    );

    const paginatedCourses = this.paginateCourses(processedCourses, filterDto);

    const coursesWithEnrollmentStatus = await this.addEnrollmentStatus(
      paginatedCourses,
      filterDto.userId,
      filterDto.excludeEnrolled,
    );

    const pageMetaDto = new PageMetaDto({
      itemCount: processedCourses.length,
      pageOptionsDto: filterDto,
    });

    return { result: coursesWithEnrollmentStatus, meta: pageMetaDto };
  }

  private buildCourseQuery(filterDto: CourseSearchFilterDto) {
    const {
      search,
      title,
      description,
      categoryIds,
      instructorId,
      minPrice,
      maxPrice,
      excludeEnrolled,
      userId,
      status,
      includeDeleted,
      order,
      orderBy,
    } = filterDto;

    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.categories', 'categories')
      .leftJoinAndSelect('course.instructor', 'instructor');

    // Handle soft delete filter
    if (includeDeleted) {
      queryBuilder.withDeleted().where('course.deleted_at IS NOT NULL');
    } else {
      queryBuilder.where('course.deleted_at IS NULL');
    }

    // Instructor filter
    if (instructorId) {
      queryBuilder.andWhere('course.instructor = :instructorId', {
        instructorId,
      });
    }

    // Search filters
    if (search) {
      queryBuilder.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (title) {
      queryBuilder.andWhere('course.title ILIKE :title', {
        title: `%${title}%`,
      });
    }

    if (description) {
      queryBuilder.andWhere('course.description ILIKE :description', {
        description: `%${description}%`,
      });
    }

    // Price range filters
    if (minPrice !== undefined) {
      queryBuilder.andWhere('course.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('course.price <= :maxPrice', { maxPrice });
    }

    // Category filters
    if (categoryIds?.length > 0) {
      queryBuilder.andWhere('categories.id IN (:...categoryIds)', {
        categoryIds,
      });
    }

    // Status filter
    if (status !== undefined) {
      queryBuilder.andWhere('course.isActive = :status', { status });
    }

    // Sorting
    const validOrderByFields = [
      'title',
      'date_created',
      'last_updated',
      'price',
    ];
    const sortField = validOrderByFields.includes(orderBy) ? orderBy : 'title';
    queryBuilder.orderBy(`course.${sortField}`, order || 'ASC');

    return queryBuilder;
  }

  private async processCoursesWithFilters(
    courses: Course[],
    filterDto: CourseSearchFilterDto,
  ): Promise<any[]> {
    const { minRating, maxRating, excludeEnrolled, userId } = filterDto;

    const coursesWithRatings = await Promise.all(
      courses.map(async (course) => {
        const averageRating = await this.reviewService.getAverageRating(
          course.id,
        );
        return {
          ...course,
          average_rating: averageRating,
        };
      }),
    );

    let filteredCourses = coursesWithRatings;
    if (minRating !== undefined || maxRating !== undefined) {
      filteredCourses = coursesWithRatings.filter((course) => {
        const rating = course.average_rating || 0;
        const meetsMinRating = minRating === undefined || rating >= minRating;
        const meetsMaxRating = maxRating === undefined || rating <= maxRating;
        return meetsMinRating && meetsMaxRating;
      });
    }

    if (excludeEnrolled) {
      const enrolledCourseIds = await this.getEnrolledCourseIds(userId);
      filteredCourses = filteredCourses.filter(
        (course) => !enrolledCourseIds.includes(course.id),
      );
    }

    return filteredCourses;
  }

  private paginateCourses(
    courses: any[],
    filterDto: CourseSearchFilterDto,
  ): any[] {
    return courses.slice(filterDto.skip, filterDto.skip + filterDto.take);
  }

  private async addEnrollmentStatus(
    courses: any[],
    userId?: number,
    excludeEnrolled?: boolean,
  ): Promise<any[]> {
    if (!userId) {
      return courses;
    }

    // If we excluded enrolled courses, all remaining courses should have isPurchased: false
    if (excludeEnrolled) {
      return courses.map((course) => ({
        ...course,
        isPurchased: false,
      }));
    }

    // Otherwise, check actual enrollment status
    const enrolledCourseIds = await this.getEnrolledCourseIds(userId);
    return courses.map((course) => ({
      ...course,
      isPurchased: enrolledCourseIds.includes(course.id),
    }));
  }

  private async getEnrolledCourseIds(userId: number): Promise<number[]> {
    const enrollments = await this.enrollmentRepository.find({
      where: { student: { id: userId } },
      relations: ['course'],
    });
    return enrollments.map((enrollment) => enrollment.course.id);
  }

  async findCoursesByCategory(
    categoryIds: number[],
    includeDeleted: boolean = false,
  ): Promise<Course[]> {
    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .innerJoinAndSelect('course.categories', 'category')
      .where('category.id IN (:...categoryIds)', { categoryIds });

    if (includeDeleted) {
      // Show only deleted courses - need to include deleted records first
      queryBuilder.withDeleted().andWhere('course.deleted_at IS NOT NULL');
    } else {
      // Show only active (non-deleted) courses
      queryBuilder.andWhere('course.deleted_at IS NULL');
    }

    return await queryBuilder.getMany();
  }

  async findOne(id: number, includeDeleted: boolean = false): Promise<any> {
    const whereCondition: any = { id };

    if (includeDeleted) {
      const course = await this.courseRepository
        .createQueryBuilder('course')
        .leftJoinAndSelect('course.instructor', 'instructor')
        .leftJoinAndSelect('course.categories', 'categories')
        .leftJoinAndSelect('course.reviews', 'reviews')
        .leftJoinAndSelect('reviews.user', 'user')
        .where('course.id = :id', { id })
        .andWhere('course.deleted_at IS NOT NULL')
        .getOne();

      if (!course) {
        throw new BadRequestException(
          `Deleted course with ID ${id} not found.`,
        );
      }

      const averageRating = await this.reviewService.getAverageRating(
        course.id,
      );
      return {
        ...course,
        average_rating: averageRating,
      };
    }

    const course = await this.courseRepository.findOne({
      where: whereCondition,
      relations: ['instructor', 'categories', 'reviews', 'reviews.user'],
      withDeleted: false,
    });

    if (!course) {
      throw new BadRequestException(`Course with ID ${id} not found.`);
    }

    // Calculate and add average rating
    const averageRating = await this.reviewService.getAverageRating(course.id);

    return {
      ...course,
      average_rating: averageRating,
    };
  }

  async findOneWithDeleted(id: number): Promise<Course> {
    return this.findOne(id, true);
  }

  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['instructor', 'categories'],
      withDeleted: false,
    });

    if (!course) {
      throw new BadRequestException(`Course with ID ${id} not found.`);
    }

    if (updateCourseDto.title && updateCourseDto.title !== course.title) {
      const existingCourse = await this.courseRepository.findOne({
        where: { title: updateCourseDto.title },
        withDeleted: false,
      });
      if (existingCourse) {
        throw new BadRequestException(
          `The course "${updateCourseDto.title}" already exists.`,
        );
      }
    }

    const { instructorId, categoryIds, ...updateFields } = updateCourseDto;

    if (instructorId) {
      const instructor = await this.userRepository.findOne({
        where: { id: instructorId },
        withDeleted: false,
      });
      if (!instructor) {
        throw new BadRequestException(
          `Instructor with ID ${instructorId} not found.`,
        );
      }
      course.instructor = instructor;
    }

    if (categoryIds) {
      const categories = await this.categoryRepository.findByIds(categoryIds);
      if (categories.length !== categoryIds.length) {
        throw new BadRequestException(`One or more categories not found.`);
      }
      course.categories = categories;
    }

    Object.assign(course, updateFields);
    return await this.courseRepository.save(course);
  }

  async remove(id: number): Promise<any> {
    const course = await this.courseRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!course) {
      throw new BadRequestException(`Course with ID ${id} not found.`);
    }

    return await this.courseRepository.softDelete(id);
  }

  async restore(id: number): Promise<void> {
    const course = await this.courseRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!course) {
      throw new BadRequestException(
        `Course with ID ${id} not found or not deleted.`,
      );
    }

    await this.courseRepository.restore(id);
  }

  async forceRemove(id: number): Promise<void> {
    const course = await this.courseRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!course) {
      throw new BadRequestException(`Course with ID ${id} not found.`);
    }

    // Clean up progress records before permanently deleting course
    await this.lectureProgressRepository.delete({ courseId: id });

    await this.courseRepository.delete(id);
    // Note: With JSONB approach, course content is deleted with the course entity
  }

  async uploadThumbnail(
    id: number,
    file: Express.Multer.File,
  ): Promise<Course> {
    const course = await this.findOne(id);
    if (!course) {
      throw new BadRequestException('Course not found');
    }

    if (course.thumbnail_url) {
      const publicId = this.cloudinaryService.extractPublicId(
        course.thumbnail_url,
      );
      await this.cloudinaryService.deleteFile(publicId);
    }

    const thumbnailUrl = await this.cloudinaryService.uploadImage(
      file,
      'course-thumbnails',
    );

    course.thumbnail_url = thumbnailUrl;
    return this.courseRepository.save(course);
  }


  async getCourseStudentsWithProgress(
    courseId: number,
    pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<any>> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['sections', 'sections.lectures'],
      withDeleted: false,
    });
    if (!course) {
      throw new BadRequestException(`Course with ID ${courseId} not found.`);
    }

    if (!course.sections || course.sections.length === 0) {
      throw new BadRequestException('Course content not found');
    }

    const totalLectures = course.sections.reduce((total, section) => {
      return total + (section.lectures?.length || 0);
    }, 0);

    const enrollmentsQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .where('enrollment.course = :courseId', { courseId })
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [enrollments, itemCount] = await enrollmentsQuery.getManyAndCount();

    const studentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const completedLectures = await this.lectureProgressRepository.count({
          where: {
            enrollmentId: enrollment.id,
            courseId: courseId,
            isCompleted: true,
          },
        });

        const progressPercentage =
          totalLectures > 0
            ? Math.round((completedLectures / totalLectures) * 100)
            : 0;

        return {
          enrollmentId: enrollment.id,
          student: {
            id: enrollment.student.id,
            name: enrollment.student.name,
            email: enrollment.student.email,
            avatar_url: enrollment.student.avatar_url,
          },
          enrolledAt: enrollment.date_enrolled,
          completedLectures,
          totalLectures,
          progressPercentage,
        };
      }),
    );

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { result: studentsWithProgress, meta: pageMetaDto };
  }



}
