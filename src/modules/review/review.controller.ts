import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { Review } from 'src/entities/review.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { ReviewFilterDto } from './dto/review-filter.dto';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('distribution')
  async getReviewDistribution(@Query('id') courseId: string) {
    return this.reviewService.getRatingDistribution(+courseId);
  }

  @Get()
  async getAll(@Query() reviewFilterDto: ReviewFilterDto) {
    return this.reviewService.findAll(reviewFilterDto);
  }



  @Post()
  async create(@Body() review: Partial<Review>): Promise<Review> {
    return this.reviewService.create(review);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() review: Partial<Review>,
  ): Promise<Review> {
    return this.reviewService.update(id, review);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.reviewService.delete(id);
  }

  @Get('course/:courseId')
  async getByCourseWithDistribution(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query() reviewFilterDto: ReviewFilterDto,
  ) {
    return this.reviewService.findByCourse(courseId, reviewFilterDto);
  }

  @Get('user/:userId') 
  async getByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() reviewFilterDto: ReviewFilterDto,
  ) {
    return this.reviewService.findByUser(userId, reviewFilterDto);
  }

  @Post('rate')
  async addOrUpdateReview(
    @Body()
    data: {
      userId: number;
      courseId: number;
      rating: number;
      comment?: string;
    },
  ): Promise<Review> {
    const { userId, courseId, rating, comment } = data;
    return this.reviewService.addOrUpdateReview(
      userId,
      courseId,
      rating,
      comment,
    );
  }

}
