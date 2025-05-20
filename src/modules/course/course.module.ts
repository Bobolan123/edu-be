import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from 'src/entities/course.entity';
import { Review } from 'src/entities/review.entity';
import { Certification } from 'src/entities/certification.entity';
import { Payment } from 'src/entities/payment.entity';
import { Category } from 'src/entities/category.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { User } from 'src/entities/user.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Course, Review, Certification, Payment, Category, User]), CloudinaryModule],
  exports: [CourseService],
  controllers: [CourseController],  
  providers: [CourseService],
})
export class CourseModule {}
