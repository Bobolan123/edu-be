import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizSubmission } from 'src/entities/quiz_submission.entity';

@Injectable()
export class QuizSubmissionService {
  constructor(
    @InjectRepository(QuizSubmission)
    private quizSubmissionRepository: Repository<QuizSubmission>,
  ) {}

  async findAll(): Promise<QuizSubmission[]> {
    return this.quizSubmissionRepository.find({
      relations: ['user', 'quiz'],
    });
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

  async findByUser(userId: number): Promise<QuizSubmission[]> {
    return this.quizSubmissionRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'quiz'],
    });
  }

  async findByQuiz(quizId: number): Promise<QuizSubmission[]> {
    return this.quizSubmissionRepository.find({
      where: { quiz: { id: quizId } },
      relations: ['user', 'quiz'],
    });
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