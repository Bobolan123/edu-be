import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PageMetaDto, PageOptionsDto, ResponsePaginate } from 'src/common/dtos';
import { Category } from 'src/entities/category.entity';
import { User } from 'src/entities/user.entity';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private cloudinaryService: CloudinaryService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createCourseDto: CreateCourseDto) {
    const { title, instructorId, categoryIds, ...rest } = createCourseDto;

    // Check for existing course title
    const courseExists = await this.courseRepository.findOne({
      where: { title },
    });

    if (courseExists) {
      throw new BadRequestException(`The course "${title}" already exists.`);
    }

    // Get instructor entity
    const instructor = await this.userRepository.findOneBy({
      id: instructorId,
    });
    if (!instructor) {
      throw new BadRequestException(
        `Instructor with ID ${instructorId} not found.`,
      );
    }

    // Get category entities if provided
    let categories = [];
    if (categoryIds?.length) {
      categories = await this.categoryRepository.findByIds(categoryIds);

      // Validate all category IDs exist
      if (categories.length !== categoryIds.length) {
        throw new BadRequestException('One or more category IDs are invalid.');
      }
    }

    // Create course entity
    const course = this.courseRepository.create({
      ...rest,
      title,
      instructor,
      categories,
    });

    return await this.courseRepository.save(course);
  }

  async findAll(pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Course>> {
    const {
      search,
      order,
      orderBy,
      minRating,
      categoryIds,
    } = pageOptionsDto;
  
    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.categories', 'categories');
  
    // Search
    if (search) {
      queryBuilder.where('course.title LIKE :search', {
        search: `%${search}%`,
      });
    }
  
    // Filter by rating
    if (minRating) {
      queryBuilder.andWhere('course.average_rating >= :minRating', { minRating });
    }
  
    // Filter by categories
    if (categoryIds?.length > 0) {
      queryBuilder.andWhere('categories.id IN (:...categoryIds)', {
        categoryIds,
      });
    }
  
    // Sorting
    const validOrderByFields = ['title', 'date_created', 'last_updated'];
    const sortField = validOrderByFields.includes(orderBy) ? orderBy : 'title';
  
    queryBuilder
      .orderBy(`course.${sortField}`, order || 'ASC')
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);
  
    const [items, itemCount] = await queryBuilder.getManyAndCount();
  
    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });
  
    return { result: items, meta: pageMetaDto };
  }
  

  async findCoursesByCategory(categoryIds: number[]): Promise<Course[]> {
    return await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.categories', 'category')
      .where('category.id IN (:...categoryIds)', { categoryIds })
      .getMany();
  }

  async findOne(id: number): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: [
        'instructor',
        'categories',
        'reviews',
        'reviews.user',
      ],
      
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
      throw new BadRequestException(`The course "${updateCourseDto.title}" already exists.`);
    }
  
    const { instructorId, categoryIds, ...updateFields } = updateCourseDto;
  
    // Update instructor if provided
    if (instructorId) {
      const instructor = await this.userRepository.findOneBy({ id: instructorId });
      if (!instructor) {
        throw new BadRequestException(`Instructor with ID ${instructorId} not found.`);
      }
      course.instructor = instructor;
    }
  
    // Update categories if provided
    if (categoryIds) {
      const categories = await this.categoryRepository.findByIds(categoryIds);
      if (categories.length !== categoryIds.length) {
        throw new BadRequestException(`One or more categories not found.`);
      }
      course.categories = categories;
    }
  
    // Merge scalar updates (title, description, etc.)
    Object.assign(course, updateFields);
  
    return await this.courseRepository.save(course);
  }
  

  async remove(id: number): Promise<void> {
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new BadRequestException(`Course with ID ${id} not found.`);
    }

    await this.courseRepository.delete(id);
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
}
