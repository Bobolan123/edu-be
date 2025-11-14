import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { CourseContentService } from './course-content.service';
import { CourseContentController } from './course-content.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from 'src/entities/course.entity';
import { CourseSection } from 'src/entities/course-section.entity';
import { CourseLecture } from 'src/entities/course-lecture.entity';
import { Review } from 'src/entities/review.entity';
import { Certification } from 'src/entities/certification.entity';
import { Order } from 'src/entities/order.entity';
import { Category } from 'src/entities/category.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { TranscriptionModule } from '../transcription/transcription.module';
import { User } from 'src/entities/user.entity';
import { Enrollment } from 'src/entities/enrollment.entity';
import { LectureProgress } from 'src/entities/lecture-progress.entity';
import { ReviewModule } from '../review/review.module';
import { ElasticsearchModule } from '../elasticsearch/elasticsearch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseSection,
      CourseLecture,
      Review,
      Certification,
      Order,
      Category,
      User,
      Enrollment,
      LectureProgress,
    ]),
    CloudinaryModule,
    TranscriptionModule,
    ReviewModule,
    ElasticsearchModule,
  ],
  exports: [CourseService, CourseContentService],
  controllers: [CourseController, CourseContentController],
  providers: [CourseService, CourseContentService],
})
export class CourseModule {}
