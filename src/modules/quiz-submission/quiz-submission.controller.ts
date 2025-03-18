import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { QuizSubmissionService } from './quiz-submission.service';
import { QuizSubmission } from 'src/entities/quiz_submission.entity';

@Controller('quiz-submissions')
export class QuizSubmissionController {
  constructor(private readonly quizSubmissionService: QuizSubmissionService) {}

  @Get()
  findAll(): Promise<QuizSubmission[]> {
    return this.quizSubmissionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<QuizSubmission> {
    return this.quizSubmissionService.findOne(id);
  }

  @Post()
  create(@Body() submission: Partial<QuizSubmission>): Promise<QuizSubmission> {
    return this.quizSubmissionService.create(submission);
  }

  @Get('user/:userId')
  findByUser(@Param('userId', ParseIntPipe) userId: number): Promise<QuizSubmission[]> {
    return this.quizSubmissionService.findByUser(userId);
  }

  @Get('quiz/:quizId')
  findByQuiz(@Param('quizId', ParseIntPipe) quizId: number): Promise<QuizSubmission[]> {
    return this.quizSubmissionService.findByQuiz(quizId);
  }

  @Get('user/:userId/quiz/:quizId')
  findByUserAndQuiz(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('quizId', ParseIntPipe) quizId: number,
  ): Promise<QuizSubmission[]> {
    return this.quizSubmissionService.findByUserAndQuiz(userId, quizId);
  }
}