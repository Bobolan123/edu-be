import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ReviewService } from './review.service';
import { Review } from 'src/entities/review.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Review>> {
    return this.reviewService.findAll(pageOptionsDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Review> {
    return this.reviewService.findOne(id);
  }

  @Post()
  create(@Body() review: Partial<Review>): Promise<Review> {
    return this.reviewService.create(review);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() review: Partial<Review>,
  ): Promise<Review> {
    return this.reviewService.update(id, review);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.reviewService.delete(id);
  }

  @Get('course/:courseId')
  findByCourse(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Review>> {
    return this.reviewService.findByCourse(courseId, pageOptionsDto);
  }

  @Get('user/:userId')
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Review>> {
    return this.reviewService.findByUser(userId, pageOptionsDto);
  }
} 