import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QdrantService } from './qdrant.service';
import { RagSyncService } from './rag-sync.service';
import { CourseLecture } from '../../entities/course-lecture.entity';
import { CourseSection } from '../../entities/course-section.entity';
import { Course } from '../../entities/course.entity';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, CourseSection, CourseLecture]),
    forwardRef(() => GeminiModule),
  ],
  providers: [QdrantService, RagSyncService],
  exports: [QdrantService, RagSyncService],
})
export class QdrantModule {}
