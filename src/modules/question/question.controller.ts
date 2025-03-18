import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { QuestionService } from './question.service';
import { Question } from 'src/entities/question.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';

@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Question>> {
    return this.questionService.findAll(pageOptionsDto);
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
  findByQuiz(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Question>> {
    return this.questionService.findByQuiz(quizId, pageOptionsDto);
  }
} 