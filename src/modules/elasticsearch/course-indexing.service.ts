import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ElasticsearchService } from './elasticsearch.service';
import { CourseDocument } from './interfaces/course-document.interface';
import { Course } from 'src/entities/course.entity';

@Injectable()
export class CourseIndexingService {
  private readonly logger = new Logger(CourseIndexingService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  /**
   * Transform a Course entity to an Elasticsearch document
   */
  transformCourseToDocument(course: Course): CourseDocument {
    const document: CourseDocument = {
      id: course.id,
      title: course.title,
      description: course.description,
      language: course.language,
      price: course.price,
      isActive: course.isActive,
      average_rating: course.average_rating || 0,
      total_reviews: course.total_reviews || 0,
      date_created: course.date_created,
      last_updated: course.last_updated,

      instructor: course.instructor
        ? {
            id: course.instructor.id,
            name: course.instructor.name,
            email: course.instructor.email,
          }
        : null,

      categories: course.categories
        ? course.categories.map((category) => ({
            id: category.id,
            name: category.name,
          }))
        : [],

      metadata: course.metadata || {},
    };

    // Add computed fields if sections are loaded
    if (course.sections) {
      document.sections_count = course.sections.length;

      const allLectures = course.sections.flatMap(
        (section) => section.lectures || [],
      );
      document.lectures_count = allLectures.length;

      document.total_duration_seconds = allLectures.reduce(
        (sum, lecture) => sum + (lecture.durationSeconds || 0),
        0,
      );
    }

    return document;
  }

  /**
   * Index a single course
   */
  async indexCourse(course: Course): Promise<void> {
    try {
      const document = this.transformCourseToDocument(course);
      await this.elasticsearchService.indexCourse(document);
      this.logger.log(`Indexed course ${course.id}: ${course.title}`);
    } catch (error) {
      this.logger.error(
        `Failed to index course ${course.id}`,
        error.stack,
      );
    }
  }
 
  /**
   * Update a course in the index
   */
  async updateCourse(course: Course): Promise<void> {
    try {
      const document = this.transformCourseToDocument(course);
      await this.elasticsearchService.indexCourse(document);
      this.logger.log(`Updated course ${course.id}: ${course.title}`);
    } catch (error) {
      this.logger.error(
        `Failed to update course ${course.id}`,
        error.stack,
      );
    }
  }

  /**
   * Remove a course from the index
   */
  async deleteCourse(courseId: number): Promise<void> {
    try {
      await this.elasticsearchService.deleteCourse(courseId);
      this.logger.log(`Deleted course ${courseId} from index`);
    } catch (error) {
      this.logger.error(
        `Failed to delete course ${courseId}`,
        error.stack,
      );
    }
  }

  /**
   * Bulk index multiple courses
   */
  async bulkIndexCourses(courses: Course[]): Promise<void> {
    try {
      const documents = courses.map((course) =>
        this.transformCourseToDocument(course),
      );
      await this.elasticsearchService.bulkIndexCourses(documents);
      this.logger.log(`Bulk indexed ${courses.length} courses`);
    } catch (error) {
      this.logger.error('Failed to bulk index courses', error.stack);
    }
  }

  /**
   * Event listener for course creation
   */
  @OnEvent('course.created')
  async handleCourseCreated(course: Course) {
    this.logger.log(`Event received: course.created for course ${course.id}`);
    await this.indexCourse(course);
  }

  /**
   * Event listener for course update
   */
  @OnEvent('course.updated')
  async handleCourseUpdated(course: Course) {
    this.logger.log(`Event received: course.updated for course ${course.id}`);
    await this.updateCourse(course);
  }

  /**
   * Event listener for course deletion
   */
  @OnEvent('course.deleted')
  async handleCourseDeleted(payload: { courseId: number }) {
    this.logger.log(
      `Event received: course.deleted for course ${payload.courseId}`,
    );
    await this.deleteCourse(payload.courseId);
  }

  /**
   * Event listener for course restoration (soft delete undo)
   */
  @OnEvent('course.restored')
  async handleCourseRestored(course: Course) {
    this.logger.log(`Event received: course.restored for course ${course.id}`);
    await this.indexCourse(course);
  }
}
