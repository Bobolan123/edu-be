import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { Quiz } from 'src/entities/quiz.entity';
import { Course } from 'src/entities/course.entity';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,

    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(createQuizDto: CreateQuizDto): Promise<Quiz> {
    const course = await this.courseRepository.findOne({ where: { id: createQuizDto.courseId } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const quiz = this.quizRepository.create({
      ...createQuizDto,
      course,
    });

    return this.quizRepository.save(quiz);
  }

  findAll(): Promise<Quiz[]> {
    return this.quizRepository.find({ relations: ['course', 'questions'] });
  }

  async findOne(id: number): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['course', 'questions'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  async update(id: number, updateQuizDto: UpdateQuizDto): Promise<Quiz> {
    const quiz = await this.findOne(id);

    if (updateQuizDto.courseId) {
      const course = await this.courseRepository.findOne({ where: { id: updateQuizDto.courseId } });
      if (!course) {
        throw new NotFoundException('Course not found');
      }
      quiz.course = course;
    }

    Object.assign(quiz, updateQuizDto);
    return this.quizRepository.save(quiz);
  }

  async remove(id: number): Promise<void> {
    const quiz = await this.findOne(id);
    await this.quizRepository.remove(quiz);
  }
}