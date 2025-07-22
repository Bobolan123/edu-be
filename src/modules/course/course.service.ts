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
import {
  CourseContent,
  CourseContentDocument,
} from 'src/schemas/course-content.schema';

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
    pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Course>> {
    const { search, order, orderBy, minRating, categoryIds, instructorId, userId } =
      pageOptionsDto;

    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.categories', 'categories')
      .leftJoinAndSelect('course.instructor', 'instructor');

    if (instructorId) {
      queryBuilder.andWhere('course.instructor = :instructorId', {
        instructorId,
      });
    }

    if (search) {
      queryBuilder.where('course.title LIKE :search', {
        search: `%${search}%`,
      });
    }

    if (minRating) {
      queryBuilder.andWhere('course.average_rating >= :minRating', {
        minRating,
      });
    }

    if (categoryIds?.length > 0) {
      queryBuilder.andWhere('categories.id IN (:...categoryIds)', {
        categoryIds,
      });
    }

    const validOrderByFields = ['title', 'date_created', 'last_updated'];
    const sortField = validOrderByFields.includes(orderBy) ? orderBy : 'title';

    queryBuilder
      .orderBy(`course.${sortField}`, order || 'ASC')
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    let coursesWithEnrollmentStatus = items;
    if (userId) {
      const enrolledCourseIds = await this.getEnrolledCourseIds(userId);
      coursesWithEnrollmentStatus = items.map(course => ({
        ...course,
        isPurchased: enrolledCourseIds.includes(course.id),
      })); 
    }

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    return { result: coursesWithEnrollmentStatus, meta: pageMetaDto };
  }

  private async getEnrolledCourseIds(userId: number): Promise<number[]> {
    const enrollments = await this.enrollmentRepository.find({
      where: { student: { id: userId } },
      relations: ['course'],
    });
    return enrollments.map(enrollment => enrollment.course.id);
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

    return course;
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
    sectionIndex: number,
    lectureIndex: number,
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

    const section = courseContent.sections[sectionIndex];
    if (!section) throw new BadRequestException('Section not found');

    const lecture = section.lectures[lectureIndex];
    if (!lecture) throw new BadRequestException('Lecture not found');

    if (lecture.videoUrl) {
      const publicId = this.cloudinaryService.extractPublicId(lecture.videoUrl);
      await this.cloudinaryService.deleteFile(publicId);
    }

    const { url, duration } = await this.cloudinaryService.uploadVideo(
      file,
      'course-lectures',
    );

    return url;
  }

  //   // Upload video to Cloudinary

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
