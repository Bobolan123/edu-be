import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CourseIndexingService } from '../modules/elasticsearch/course-indexing.service';
import { ElasticsearchService } from '../modules/elasticsearch/elasticsearch.service';
import { Course } from '../entities/course.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const courseRepository = app.get<Repository<Course>>(
    getRepositoryToken(Course),
  );
  const elasticsearchService = app.get(ElasticsearchService);
  const courseIndexingService = app.get(CourseIndexingService);

  console.log('🚀 Starting Elasticsearch course indexing...');

  try {
    // Optionally: Delete existing index to start fresh
    const shouldReIndex = process.argv.includes('--reindex');
    if (shouldReIndex) {
      console.log('⚠️  Deleting existing index...');
      try {
        await elasticsearchService.deleteIndex();
      } catch (error) {
        console.log('No existing index to delete or error occurred:', error.message);
      }

      // Recreate the index
      console.log('📝 Creating new index with mappings...');
      await elasticsearchService.createCoursesIndex();
    }

    // Fetch all active courses with relations
    console.log('📚 Fetching courses from database...');
    const courses = await courseRepository.find({
      where: { deleted_at: null as any },
      relations: ['instructor', 'categories', 'sections', 'sections.lectures'],
      withDeleted: false,
    });

    console.log(`✅ Found ${courses.length} courses to index`);

    if (courses.length === 0) {
      console.log('⚠️  No courses found. Exiting...');
      await app.close();
      return;
    }

    // Bulk index courses in batches
    const batchSize = 50;
    let indexed = 0;

    for (let i = 0; i < courses.length; i += batchSize) {
      const batch = courses.slice(i, i + batchSize);
      console.log(
        `📤 Indexing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(courses.length / batchSize)} (${batch.length} courses)`,
      );

      await courseIndexingService.bulkIndexCourses(batch);
      indexed += batch.length;

      console.log(`✅ Indexed ${indexed}/${courses.length} courses`);
    }

    console.log('🎉 Successfully indexed all courses!');
    console.log('\n📊 Indexing Summary:');
    console.log(`   Total courses: ${courses.length}`);
    console.log(`   Successfully indexed: ${indexed}`);
    console.log(
      `   Index name: ${process.env.ELASTICSEARCH_INDEX_COURSES || 'courses'}`,
    );
  } catch (error) {
    console.error('❌ Error during indexing:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
