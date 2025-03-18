import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from 'src/entities/question.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { PageMetaDto } from 'src/common/dtos/page-meta.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
  ) {}

  async findAll(pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Question>> {
    const queryBuilder = this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.quiz', 'quiz');

    if (pageOptionsDto.search) {
      queryBuilder.where('question.content LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    queryBuilder
      .orderBy(`question.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return new ResponsePaginate(items, pageMetaDto, 'Questions retrieved successfully');
  }

  async findOne(id: number): Promise<Question> {
    return this.questionRepository.findOne({
      where: { id },
      relations: ['quiz'],
    });
  }

  async create(question: Partial<Question>): Promise<Question> {
    const newQuestion = this.questionRepository.create(question);
    return this.questionRepository.save(newQuestion);
  }

  async update(id: number, question: Partial<Question>): Promise<Question> {
    await this.questionRepository.update(id, question);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.questionRepository.delete(id);
  }

  async findByQuiz(quizId: number, pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Question>> {
    const queryBuilder = this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.quiz', 'quiz')
      .where('quiz.id = :quizId', { quizId });

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('question.content LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    queryBuilder
      .orderBy(`question.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return new ResponsePaginate(items, pageMetaDto, 'Quiz questions retrieved successfully');
  }
} 