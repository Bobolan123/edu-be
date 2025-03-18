import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from 'src/entities/review.entity';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Review])],
  exports: [ReviewService],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {} 