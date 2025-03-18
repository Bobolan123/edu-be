import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ReviewService } from './review.service';
import { Review } from 'src/entities/review.entity';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  findAll(): Promise<Review[]> {
    return this.reviewService.findAll();
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
  findByCourse(@Param('courseId', ParseIntPipe) courseId: number): Promise<Review[]> {
    return this.reviewService.findByCourse(courseId);
  }

  @Get('user/:userId')
  findByUser(@Param('userId', ParseIntPipe) userId: number): Promise<Review[]> {
    return this.reviewService.findByUser(userId);
  }
} 