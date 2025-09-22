import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from '../../entities/course.entity';
import { User } from 'src/entities/user.entity';
import { Category } from 'src/entities/category.entity';
import { Enrollment } from 'src/entities/enrollment.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PageMetaDto, PageOptionsDto, ResponsePaginate } from 'src/common/dtos';
import { CourseSearchFilterDto } from './dto/course-search-filter.dto';
import {
  CourseContent,
  CourseContentDocument,
} from 'src/schemas/course-content.schema';
import {
  LectureProgress,
  LectureProgressDocument,
} from 'src/schemas/lecture-progress.schema';
import {
  LectureCaption,
  LectureCaptionDocument,
  CaptionStatus,
  CaptionFormat,
} from 'src/schemas/lecture-caption.schema';
import { ReviewService } from '../review/review.service';
import { CourseProgressSyncService } from './course-progress-sync.service';

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

    private cloudinaryService: CloudinaryService,

    @InjectModel(CourseContent.name)
    private readonly courseContentModel: Model<CourseContentDocument>,

    @InjectModel(LectureProgress.name)
    private readonly lectureProgressModel: Model<LectureProgressDocument>,

    @InjectModel(LectureCaption.name)
    private readonly lectureCaptionModel: Model<LectureCaptionDocument>,

    private readonly reviewService: ReviewService,

    private readonly courseProgressSyncService: CourseProgressSyncService,
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
  ): Promise<Course[]> {
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
    courses: Course[],
    filterDto: CourseSearchFilterDto,
  ): Course[] {
    return courses.slice(filterDto.skip, filterDto.skip + filterDto.take);
  }

  private async addEnrollmentStatus(
    courses: Course[],
    userId?: number,
    excludeEnrolled?: boolean,
  ): Promise<Course[]> {
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

  async findOne(id: number, includeDeleted: boolean = false): Promise<Course> {
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

    // Clean up progress records before permanently deleting course content
    await this.lectureProgressModel.deleteMany({ courseId: id });

    await this.courseRepository.delete(id);
    await this.courseContentModel.deleteOne({ courseId: id });
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

  // upload new video lecture when it uploaded
  async uploadLecture(
    courseId: number,
    sectionId: string,
    lectureId: string,
    file: Express.Multer.File,
  ) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      withDeleted: false,
    });
    if (!course) {
      throw new BadRequestException('Course not found');
    }

    const courseContent = await this.courseContentModel.findOne({ courseId });
    if (!courseContent)
      throw new BadRequestException('Course content not found');

    const section = courseContent.sections.find(
      (s) => s._id.toString() === sectionId,
    );
    if (!section) throw new BadRequestException('Section not found');

    const lecture = section.lectures.find(
      (l) => l._id.toString() === lectureId,
    );
    if (!lecture) throw new BadRequestException('Lecture not found');

    if (lecture.videoUrl) {
      const publicId = this.cloudinaryService.extractPublicId(lecture.videoUrl);
      await this.cloudinaryService.deleteFile(publicId);
    }

    const { url, publicId } = await this.cloudinaryService.uploadVideo(
      file,
      'course-lectures',
    );

    lecture.videoUrl = url;
    await courseContent.save();

    // Auto-generate captions
    const caption = new this.lectureCaptionModel({
      lectureId,
      courseId,
      videoPublicId: publicId,
      status: CaptionStatus.COMPLETED,
      cloudinaryFiles: new Map([
        ['srt', this.cloudinaryService.getCaptionUrl(publicId, 'srt')],
        ['vtt', this.cloudinaryService.getCaptionUrl(publicId, 'vtt')],
        ['transcript', this.cloudinaryService.getCaptionUrl(publicId, 'transcript')],
      ]),
    });
    await caption.save();

    // Synchronize progress after lecture upload
    await this.courseProgressSyncService.synchronizeProgressWithContent(
      courseId,
    );

    return url;
  }

  async getCourseContent(courseId: number) {
    const content = await this.courseContentModel.findOne({ courseId }).lean();
    if (!content) {
      throw new BadRequestException('No content found for this course');
    }
    return content;
  }

  async upsertCourseContent(courseId: number, content: any) {
    const result = await this.courseContentModel.findOneAndUpdate(
      { courseId },
      { $set: { ...content } },
      { upsert: true, new: true },
    );

    // Synchronize progress after content update
    await this.courseProgressSyncService.synchronizeProgressWithContent(
      courseId,
    );

    return result;
  }

  async getCourseStudentsWithProgress(
    courseId: number,
    pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<any>> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      withDeleted: false,
    });
    if (!course) {
      throw new BadRequestException(`Course with ID ${courseId} not found.`);
    }

    const courseContent = await this.courseContentModel.findOne({ courseId });
    if (!courseContent) {
      throw new BadRequestException('Course content not found');
    }

    // Calculate totalLectures from sections array
    const totalLectures =
      courseContent.sections?.reduce((total, section) => {
        return total + (section.lectures?.length || 0);
      }, 0) || 0;

    const enrollmentsQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .where('enrollment.course = :courseId', { courseId })
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [enrollments, itemCount] = await enrollmentsQuery.getManyAndCount();

    const studentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const completedLectures =
          await this.lectureProgressModel.countDocuments({
            enrollmentId: enrollment.id,
            courseId: courseId,
            isCompleted: true,
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


  async getCaptions(lectureId: string, format: CaptionFormat) {
    const caption = await this.lectureCaptionModel.findOne({ lectureId });
    if (!caption || caption.status !== CaptionStatus.COMPLETED) {
      throw new BadRequestException('Captions not available');
    }

    const captionUrl = caption.cloudinaryFiles?.get(format);
    if (!captionUrl) {
      throw new BadRequestException(`Caption format ${format} not available`);
    }

    return { url: captionUrl, format };
  }

  async getCaptionStatus(lectureId: string) {
    const caption = await this.lectureCaptionModel.findOne({ lectureId });
    if (!caption) {
      return { status: CaptionStatus.PENDING, available: false };
    }

    return {
      status: caption.status,
      available: caption.status === CaptionStatus.COMPLETED,
      error: caption.processingError,
      formats: caption.cloudinaryFiles ? Object.keys(caption.cloudinaryFiles) : [],
    };
  }
}
