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

    private cloudinaryService: CloudinaryService,

    @InjectModel(CourseContent.name)
    private readonly courseContentModel: Model<CourseContentDocument>,

    private readonly reviewService: ReviewService,
  ) {}

  async create(createCourseDto: CreateCourseDto) {
    const { title, instructorId, categoryIds, ...rest } = createCourseDto;

    const courseExists = await this.courseRepository.findOne({
      where: { title },
    });
    if (courseExists) {
      throw new BadRequestException(`The course "${title}" already exists.`);
    }

    const instructor = await this.userRepository.findOneBy({
      id: instructorId,
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
    const {
      search,
      title,
      description,
      order,
      orderBy,
      minRating,
      maxRating,
      categoryIds,
      instructorId,
      userId,
      minPrice,
      maxPrice,
    } = filterDto;

    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.categories', 'categories')
      .leftJoinAndSelect('course.instructor', 'instructor');

    // Instructor filter
    if (instructorId) {
      queryBuilder.andWhere('course.instructor = :instructorId', {
        instructorId,
      });
    }

    // General search across title and description
    if (search) {
      queryBuilder.andWhere(
        '(course.title LIKE :search OR course.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Specific title search
    if (title) {
      queryBuilder.andWhere('course.title LIKE :title', {
        title: `%${title}%`,
      });
    }

    // Specific description search
    if (description) {
      queryBuilder.andWhere('course.description LIKE :description', {
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

    // Sorting
    const validOrderByFields = [
      'title',
      'date_created',
      'last_updated',
      'price',
    ];
    const sortField = validOrderByFields.includes(orderBy) ? orderBy : 'title';

    // If rating filters are applied, we need to get all items first, filter by rating, then paginate
    if (minRating !== undefined || maxRating !== undefined) {
      // Get all matching courses without pagination
      const allItems = await queryBuilder
        .orderBy(`course.${sortField}`, order || 'ASC')
        .getMany();

      // Calculate ratings and filter
      const coursesWithRatings = await Promise.all(
        allItems.map(async (course) => {
          const averageRating = await this.reviewService.getAverageRating(
            course.id,
          );
          return {
            ...course,
            average_rating: averageRating,
          };
        }),
      );

      const filteredCourses = coursesWithRatings.filter((course) => {
        const rating = course.average_rating || 0;
        const meetsMinRating = minRating === undefined || rating >= minRating;
        const meetsMaxRating = maxRating === undefined || rating <= maxRating;
        return meetsMinRating && meetsMaxRating;
      });

      // Apply pagination to filtered results
      const totalItemCount = filteredCourses.length;
      const paginatedCourses = filteredCourses.slice(
        filterDto.skip,
        filterDto.skip + filterDto.take,
      );

      // Add enrollment status if userId provided
      let coursesWithEnrollmentStatus = paginatedCourses;
      if (userId) {
        const enrolledCourseIds = await this.getEnrolledCourseIds(userId);
        coursesWithEnrollmentStatus = paginatedCourses.map((course) => ({
          ...course,
          isPurchased: enrolledCourseIds.includes(course.id),
        }));
      }

      const pageMetaDto = new PageMetaDto({
        itemCount: totalItemCount,
        pageOptionsDto: filterDto,
      });

      return { result: coursesWithEnrollmentStatus, meta: pageMetaDto };
    } else {
      // No rating filters, use normal pagination
      queryBuilder
        .orderBy(`course.${sortField}`, order || 'ASC')
        .skip(filterDto.skip)
        .take(filterDto.take);

      const [items, itemCount] = await queryBuilder.getManyAndCount();

      // Calculate average rating for each course
      const coursesWithRatings = await Promise.all(
        items.map(async (course) => {
          const averageRating = await this.reviewService.getAverageRating(
            course.id,
          );
          return {
            ...course,
            average_rating: averageRating,
          };
        }),
      );

      // Add enrollment status if userId provided
      let coursesWithEnrollmentStatus = coursesWithRatings;
      if (userId) {
        const enrolledCourseIds = await this.getEnrolledCourseIds(userId);
        coursesWithEnrollmentStatus = coursesWithRatings.map((course) => ({
          ...course,
          isPurchased: enrolledCourseIds.includes(course.id),
        }));
      }

      const pageMetaDto = new PageMetaDto({
        itemCount,
        pageOptionsDto: filterDto,
      });

      return { result: coursesWithEnrollmentStatus, meta: pageMetaDto };
    }
  }

  private async getEnrolledCourseIds(userId: number): Promise<number[]> {
    const enrollments = await this.enrollmentRepository.find({
      where: { student: { id: userId } },
      relations: ['course'],
    });
    return enrollments.map((enrollment) => enrollment.course.id);
  }

  async findCoursesByCategory(categoryIds: number[]): Promise<Course[]> {
    return await this.courseRepository
      .createQueryBuilder('course')
      .innerJoinAndSelect('course.categories', 'category')
      .where('category.id IN (:...categoryIds)', { categoryIds })
      .getMany();
  }

  async findOne(id: number): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['instructor', 'categories', 'reviews', 'reviews.user'],
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

  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['instructor', 'categories'],
    });

    if (!course) {
      throw new BadRequestException(`Course with ID ${id} not found.`);
    }

    if (course.title === updateCourseDto.title) {
      throw new BadRequestException(
        `The course "${updateCourseDto.title}" already exists.`,
      );
    }

    const { instructorId, categoryIds, ...updateFields } = updateCourseDto;

    if (instructorId) {
      const instructor = await this.userRepository.findOneBy({
        id: instructorId,
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

  async remove(id: number): Promise<void> {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new BadRequestException(`Course with ID ${id} not found.`);
    }

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
    });
    if (!course) {
      throw new BadRequestException('Course not found');
    }

    const courseContent = await this.courseContentModel.findOne({ courseId });
    if (!courseContent)
      throw new BadRequestException('Course content not found');

    const section = courseContent.sections.find(s => s._id.toString() === sectionId);
    if (!section) throw new BadRequestException('Section not found');

    const lecture = section.lectures.find(l => l._id.toString() === lectureId);
    if (!lecture) throw new BadRequestException('Lecture not found');

    if (lecture.videoUrl) {
      const publicId = this.cloudinaryService.extractPublicId(lecture.videoUrl);
      await this.cloudinaryService.deleteFile(publicId);
    }

    const { url } = await this.cloudinaryService.uploadVideo(
      file,
      'course-lectures',
    );

    lecture.videoUrl = url;
    await courseContent.save();

    return url;
  }

  // Upload video to Cloudinary

  async getCourseContent(courseId: number) {
    const content = await this.courseContentModel.findOne({ courseId }).lean();
    if (!content) {
      throw new BadRequestException('No content found for this course');
    }
    return content;
  }

  async upsertCourseContent(courseId: number, content: any) {
    return await this.courseContentModel.findOneAndUpdate(
      { courseId },
      { $set: { ...content } },
      { upsert: true, new: true },
    );
  }
}
