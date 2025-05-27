import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from '../../entities/course.entity';
import { User } from 'src/entities/user.entity';
import { Category } from 'src/entities/category.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PageMetaDto, PageOptionsDto, ResponsePaginate } from 'src/common/dtos';
import {
  CourseContent,
  CourseContentDocument,
} from './course-content/course-content.schema';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    private cloudinaryService: CloudinaryService,

    @InjectModel(CourseContent.name)
    private readonly courseContentModel: Model<CourseContentDocument>,
  ) {}

  // ====================== PostgreSQL ======================
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
    const { search, order, orderBy, minRating, categoryIds, instructorId } =
      pageOptionsDto;

    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.categories', 'categories');

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
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    return { result: items, meta: pageMetaDto };
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

    const thumbnailUrl = await this.cloudinaryService.uploadImage(
      file,
      'course-thumbnails',
    );
    course.thumbnail_url = thumbnailUrl;
    return this.courseRepository.save(course);
  }

  // ====================== MongoDB (Course Content) ======================

  async getCourseContent(courseId: number) {
    const content = await this.courseContentModel.findOne({ courseId }).lean();
    if (!content) {
      throw new BadRequestException('No content found for this course');
    }
    return content;
  }

  async upsertCourseContent(courseId: number, content: any) {
    return this.courseContentModel.findOneAndUpdate(
      { courseId },
      { $set: { ...content } },
      { upsert: true, new: true },
    );
  }
}
