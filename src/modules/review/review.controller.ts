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
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { Review } from 'src/entities/review.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { ReviewFilterDto } from './dto/review-filter.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('distribution')
  @ResponseMessage('Get review distribution')
  async getReviewDistribution(@Query('id') courseId: string) {
    return this.reviewService.getRatingDistribution(+courseId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Create new review')
  async create(@Body() createReviewDto: CreateReviewDto): Promise<Review> {
    return this.reviewService.createReview(createReviewDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Update review')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReviewDto: UpdateReviewDto,
  ): Promise<Review> {
    return this.reviewService.updateReview(id, updateReviewDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Delete review')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.reviewService.delete(id);
  }

  @Get('course/:courseId')
  @ResponseMessage('Get course reviews')
  async findByCourse(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query() reviewFilterDto: ReviewFilterDto,
  ) {
    return this.reviewService.findByCourse(courseId, reviewFilterDto);
  }
 
  @Get('user/:userId/course/:courseId')
  @ResponseMessage('Get user course review')
  async getUserCourseReview(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.reviewService.findUserCourseReview(userId, courseId);
  }
}
