import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from 'src/entities/question.entity';

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
  ) {}

  async findAll(): Promise<Question[]> {
    return this.questionRepository.find({
      relations: ['quiz'],
    });
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

  async findByQuiz(quizId: number): Promise<Question[]> {
    return this.questionRepository.find({
      where: { quiz: { id: quizId } },
      relations: ['quiz'],
    });
  }
} 