import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { Course } from 'src/entities/course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course])],
  exports: [LessonService],
  controllers: [LessonController],  
  providers: [LessonService],
})
export class LessonModule {}
