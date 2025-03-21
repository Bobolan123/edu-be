import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { Course } from 'src/entities/course.entity';
import { Section } from 'src/entities/section.entity';
import { Lesson } from 'src/entities/lesson.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
@Module({
  imports: [TypeOrmModule.forFeature([Course, Section, Lesson]), CloudinaryModule],
  exports: [LessonService],
  controllers: [LessonController],  
  providers: [LessonService],
})
export class LessonModule {}
