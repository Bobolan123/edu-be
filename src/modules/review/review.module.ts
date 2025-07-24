import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from 'src/entities/review.entity';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { Course } from 'src/entities/course.entity';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Course, User])],
  exports: [ReviewService],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
