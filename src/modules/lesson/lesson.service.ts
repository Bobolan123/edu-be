import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from 'src/entities/lesson.entity';
import { Course } from 'src/entities/course.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,

    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async findAll(): Promise<Lesson[]> {
    return this.lessonRepository.find({ relations: ['course'] });
  }

  async findOne(id: number): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({ where: { id }, relations: ['course'] });
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }
    return lesson;
  }

  async create(createLessonDto: CreateLessonDto): Promise<Lesson> {
    const { courseId, title, content, order, resources } = createLessonDto;

    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const lesson = this.lessonRepository.create({
      course,
      title,
      content,
      order,
      resources,
    });

    return this.lessonRepository.save(lesson);
  }

  async update(id: number, updateLessonDto: UpdateLessonDto): Promise<Lesson> {
    const lesson = await this.findOne(id);

    Object.assign(lesson, updateLessonDto);

    return this.lessonRepository.save(lesson);
  }

  async remove(id: number): Promise<void> {
    const lesson = await this.findOne(id);
    await this.lessonRepository.remove(lesson);
  }
}