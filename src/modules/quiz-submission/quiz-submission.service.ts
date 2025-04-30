import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizSubmission } from 'src/entities/quiz_submission.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { PageMetaDto } from 'src/common/dtos/page-meta.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';

@Injectable()
export class QuizSubmissionService {
  constructor(
    @InjectRepository(QuizSubmission)
    private quizSubmissionRepository: Repository<QuizSubmission>,
  ) {}

  async findAll(pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<QuizSubmission>> {
    const queryBuilder = this.quizSubmissionRepository
      .createQueryBuilder('quizSubmission')
      .leftJoinAndSelect('quizSubmission.user', 'user')
      .leftJoinAndSelect('quizSubmission.quiz', 'quiz');

    if (pageOptionsDto.search) {
      queryBuilder.where('user.name LIKE :search OR quiz.title LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    queryBuilder
      .orderBy(`quizSubmission.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { result: items, meta: pageMetaDto };
  }

  async findOne(id: number): Promise<QuizSubmission> {
    return this.quizSubmissionRepository.findOne({
      where: { id },
      relations: ['user', 'quiz'],
    });
  }

  async create(submission: Partial<QuizSubmission>): Promise<QuizSubmission> {
    const newSubmission = this.quizSubmissionRepository.create(submission);
    return this.quizSubmissionRepository.save(newSubmission);
  }

  async findByUser(userId: number, pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<QuizSubmission>> {
    const queryBuilder = this.quizSubmissionRepository
      .createQueryBuilder('quizSubmission')
      .leftJoinAndSelect('quizSubmission.user', 'user')
      .leftJoinAndSelect('quizSubmission.quiz', 'quiz')
      .where('user.id = :userId', { userId });

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('quiz.title LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    queryBuilder
      .orderBy(`quizSubmission.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { result: items, meta: pageMetaDto };
  }

  async findByQuiz(quizId: number, pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<QuizSubmission>> {
    const queryBuilder = this.quizSubmissionRepository
      .createQueryBuilder('quizSubmission')
      .leftJoinAndSelect('quizSubmission.user', 'user')
      .leftJoinAndSelect('quizSubmission.quiz', 'quiz')
      .where('quiz.id = :quizId', { quizId });

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('user.name LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    queryBuilder
      .orderBy(`quizSubmission.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { result: items, meta: pageMetaDto };
  }

  async findByUserAndQuiz(userId: number, quizId: number): Promise<QuizSubmission[]> {
    return this.quizSubmissionRepository.find({
      where: {
        user: { id: userId },
        quiz: { id: quizId },
      },
      relations: ['user', 'quiz'],
    });
  }
} 