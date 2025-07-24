import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { User } from '../../entities/user.entity';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { Course } from 'src/entities/course.entity';
import { Enrollment } from 'src/entities/enrollment.entity';
import {
  LectureProgress,
  LectureProgressSchema,
} from 'src/schemas/lecture-progress.schema';
import {
  CourseContent,
  CourseContentSchema,
} from 'src/schemas/course-content.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, User, Course]),
    MongooseModule.forFeature([
      { name: LectureProgress.name, schema: LectureProgressSchema },
      { name: CourseContent.name, schema: CourseContentSchema },
    ]),
  ],
  exports: [EnrollmentService],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
})
export class EnrollmentModule {}
