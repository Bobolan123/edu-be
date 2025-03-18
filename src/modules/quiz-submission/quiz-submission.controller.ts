import { Controller, Get, Post, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { QuizSubmissionService } from './quiz-submission.service';
import { QuizSubmission } from 'src/entities/quiz_submission.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';

@Controller('quiz-submissions')
export class QuizSubmissionController {
  constructor(private readonly quizSubmissionService: QuizSubmissionService) {}

  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<QuizSubmission>> {
    return this.quizSubmissionService.findAll(pageOptionsDto);
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
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<QuizSubmission>> {
    return this.quizSubmissionService.findByUser(userId, pageOptionsDto);
  }

  @Get('quiz/:quizId')
  findByQuiz(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<QuizSubmission>> {
    return this.quizSubmissionService.findByQuiz(quizId, pageOptionsDto);
  }

  @Get('user/:userId/quiz/:quizId')
  findByUserAndQuiz(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('quizId', ParseIntPipe) quizId: number,
  ): Promise<QuizSubmission[]> {
    return this.quizSubmissionService.findByUserAndQuiz(userId, quizId);
  }
}