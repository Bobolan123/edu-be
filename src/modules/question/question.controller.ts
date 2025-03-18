import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { QuestionService } from './question.service';
import { Question } from 'src/entities/question.entity';

@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Get()
  findAll(): Promise<Question[]> {
    return this.questionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Question> {
    return this.questionService.findOne(id);
  }

  @Post()
  create(@Body() question: Partial<Question>): Promise<Question> {
    return this.questionService.create(question);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() question: Partial<Question>,
  ): Promise<Question> {
    return this.questionService.update(id, question);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.questionService.delete(id);
  }

  @Get('quiz/:quizId')
  findByQuiz(@Param('quizId', ParseIntPipe) quizId: number): Promise<Question[]> {
    return this.questionService.findByQuiz(quizId);
  }
} 