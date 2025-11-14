import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElasticsearchService } from './elasticsearch.service';
import { CourseIndexingService } from './course-indexing.service';

@Module({
  imports: [ConfigModule],
  providers: [ElasticsearchService, CourseIndexingService],
  exports: [ElasticsearchService, CourseIndexingService],
})
export class ElasticsearchModule {}
