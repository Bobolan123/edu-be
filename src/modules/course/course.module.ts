import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from 'src/entities/course.entity';
import { Review } from 'src/entities/review.entity';
import { Certification } from 'src/entities/certification.entity';
import { Order } from 'src/entities/order.entity';
import { Category } from 'src/entities/category.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { User } from 'src/entities/user.entity';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CourseContent,
  CourseContentSchema,
} from 'src/schemas/course-content.schema';
import {
  LectureProgress,
  LectureProgressSchema,
} from 'src/schemas/lecture-progress.schema';
import { Enrollment } from 'src/entities/enrollment.entity';
import { ReviewModule } from '../review/review.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      Review,
      Certification,
      Order,
      Category,
      User,
      Enrollment,
    ]),
    CloudinaryModule,
    MongooseModule.forFeature([
      { name: CourseContent.name, schema: CourseContentSchema },
      { name: LectureProgress.name, schema: LectureProgressSchema },
    ]),
    ReviewModule,
  ],
  exports: [CourseService],
  controllers: [CourseController],
  providers: [CourseService],
})
export class CourseModule {}
