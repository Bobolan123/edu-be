import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(createCourseDto: CreateCourseDto) {
    const courseExists = await this.courseRepository.findOne({
      where: { title: createCourseDto.title },
    });

    if (courseExists) {
      throw new BadRequestException(`The course "${createCourseDto.title}" already exists.`);
    }

    const course = this.courseRepository.create(createCourseDto);
    return await this.courseRepository.save(course);
  }

  async findAll(): Promise<Course[]> {
    return await this.courseRepository.find({
      relations: ['category', 'sections', 'reviews'],
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Course> {
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new BadRequestException(`Course with ID ${id} not found.`);
    }

    return course;
  }

  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new BadRequestException(`Course with ID ${id} not found.`);
    }

    Object.assign(course, updateCourseDto);

    return await this.courseRepository.save(course);
  }

  async remove(id: number): Promise<void> {
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new BadRequestException(`Course with ID ${id} not found.`);
    }

    await this.courseRepository.delete(id);
  }

  async uploadThumbnail(id: number, file: Express.Multer.File): Promise<Course> {
    const course = await this.findOne(id);
    if (!course) {
      throw new BadRequestException('Course not found');
    }

    const thumbnailUrl = await this.cloudinaryService.uploadImage(file, 'course-thumbnails');
    course.thumbnail_url = thumbnailUrl;
    return this.courseRepository.save(course);
  }
}

