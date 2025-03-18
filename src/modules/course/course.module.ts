import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from 'src/entities/course.entity';
import { Lesson } from 'src/entities/lesson.entity';
import { Quiz } from 'src/entities/quiz.entity';
import { Review } from 'src/entities/review.entity';
import { Certification } from 'src/entities/certification.entity';
import { Payment } from 'src/entities/payment.entity';
import { Category } from 'src/entities/category.entity';
import { Section } from 'src/entities/section.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Section, Lesson, Quiz, Review, Certification, Payment, Category])],
  exports: [CourseService],
  controllers: [CourseController],  
  providers: [CourseService],
})
export class CourseModule {}
